const { XeroClient } = require("xero-node");
const XeroToken = require("../models/XeroToken");

// Xero Client
const xero = new XeroClient({
  clientId: `6030C0D1BF0B42C59AC0056C098BAD87`,
  // clientId: process.env.XERO_CLIENT_ID,
  clientSecret: `QfxeO6UQZb3ZPR_0z1EPMtdXDGhLroFaEFJC9dSYN-C9iKzI`,
  // clientSecret: process.env.XERO_CLIENT_SECRET,
  redirectUris: [`http://localhost:8000/api/auth/xero/callback`],
  // redirectUris: [process.env.XERO_REDIRECT_URI],
  scopes: [
    "openid",
    "profile",
    "email",
    "accounting.transactions",
    "accounting.contacts",
    "accounting.settings",
    "offline_access",
  ],
});

// Get auth URL
function getXeroAuthUrl() {
  return xero.buildConsentUrl();
}

// Get access token
async function getXeroAccessToken() {
  try {
    const tokenData = await XeroToken.findOne().sort({ updatedAt: -1 });

    if (!tokenData) {
      throw new Error("Xero not connected. Please authorize first.");
    }

    // Check if token is expired
    const now = new Date();
    const expiresAt = new Date(tokenData.expiresAt);
    const bufferTime = 5 * 60 * 1000; // 5 minutes

    if (now.getTime() >= expiresAt.getTime() - bufferTime) {
      xero.setTokenSet({
        access_token: tokenData.accessToken,
        refresh_token: tokenData.refreshToken,
        expires_in: 1800,
      });

      const newTokenSet = await xero.refreshToken();

      // Update DB new tokens
      const newExpiresAt = new Date();
      newExpiresAt.setSeconds(
        newExpiresAt.getSeconds() + newTokenSet.expires_in
      );

      await XeroToken.findByIdAndUpdate(tokenData._id, {
        accessToken: newTokenSet.access_token,
        refreshToken: newTokenSet.refresh_token,
        expiresAt: newExpiresAt,
        updatedAt: new Date(),
      });

      return newTokenSet.access_token;
    }
    return tokenData.accessToken;
  } catch (error) {
    throw error;
  }
}

// Get Xero tenant ID
async function getXeroTenantId() {
  const tokenData = await XeroToken.findOne().sort({ updatedAt: -1 });

  if (!tokenData) {
    throw new Error("Xero not connected. Please authorize first.");
  }

  return tokenData.tenantId;
}

// Check if Xero is connected
async function isXeroConnected() {
  const tokenData = await XeroToken.findOne().sort({ updatedAt: -1 });
  return !!tokenData;
}

const getDefaultTaxType = async (xero, tenantId) => {
  try {
    const { body } = await xero.accountingApi.getTaxRates(tenantId);
    const defaultTax =
      body.taxRates.find((rate) => rate.name === "GST on Income") ||
      body.taxRates.find((rate) => rate.taxType === "OUTPUT") ||
      body.taxRates[0];

    return defaultTax?.taxType || "NONE";
  } catch (err) {
    console.error("⚠️ Failed to fetch tax type:", err.message);
    return "NONE";
  }
};

const getDefaultRevenueAccount = async (xero, tenantId) => {
  try {
    const { body } = await xero.accountingApi.getAccounts(tenantId);
    const revenueAccount =
      body.accounts.find((acc) => acc.type === "REVENUE" && acc.code) ||
      body.accounts.find((acc) => acc.name?.toLowerCase().includes("sales")) ||
      body.accounts[0];

    return revenueAccount?.code || "200";
  } catch (err) {
    console.error("⚠️ Failed to fetch revenue account:", err.message);
    return "200";
  }
};

const buildLineItems = (contract, taxType, accountCode) => {
  try {
    const lineItems = [];

    // Helper function to calculate brokerage amount
    const calculateBrokerageAmount = () => {
      const brokerageRate = contract.brokerageRate || 0;
      const priceExGST = contract.priceExGST || 0;
      const tonnes = contract.tonnes || 0;

      // Calculate total brokerage
      const totalBrokerage = (priceExGST * tonnes * brokerageRate) / 100;

      // If split between buyer and seller, divide by 2
      if (
        contract.brokeragePayableBy === "buyer & seller" ||
        contract.brokeragePayableBy === "seller & buyer"
      ) {
        return totalBrokerage / 2;
      }

      return totalBrokerage;
    };

    const brokerageAmount = calculateBrokerageAmount();

    // Build description with all contract details
    const descriptionParts = [
      `Contract: ${contract.contractNumber || "N/A"}`,
      `${contract.tonnes || 0}mt ${contract.grade || ""}`,
      `Seller: ${contract.seller?.legalName || "Unknown"}`,
      `Buyer: ${contract.buyer?.name || "Unknown"}`,
    ];

    // Add optional details
    if (contract.deliveryDestination) {
      descriptionParts.push(`Destination: ${contract.deliveryDestination}`);
    }
    if (contract.deliveryOption) {
      descriptionParts.push(`Delivery: ${contract.deliveryOption}`);
    }
    if (contract.notes) {
      descriptionParts.push(`Notes: ${contract.notes}`);
    }

    const description = descriptionParts.join(" | ");

    // Create the line item
    // Xero will automatically calculate GST based on taxType
    // The columns will be: Description, Quantity, Unit Price, GST, Amount AUD
    lineItems.push({
      description: description,
      quantity: 1, // Quantity = 1 (total already calculated)
      unitAmount: contract.priceExGST, // Unit Price (Ex GST)
      accountCode: accountCode, // Revenue account code
      taxType: taxType, // Tax type (e.g., "OUTPUT2" for 10% GST in Australia)
    });

    console.log(`✅ Built line item for contract ${contract.contractNumber}:`, {
      description: description.substring(0, 50) + "...",
      quantity: 1,
      unitAmount: contract.priceExGST,
      taxType,
      accountCode,
    });

    return lineItems;
  } catch (err) {
    console.error("⚠️ Failed to build line items:", err.message);
    console.error("Contract data:", {
      contractNumber: contract?.contractNumber,
      priceExGST: contract?.priceExGST,
      tonnes: contract?.tonnes,
      brokerageRate: contract?.brokerageRate,
    });

    // Fallback line item
    return [
      {
        description: `Contract ${
          contract.contractNumber || "Unknown"
        } - Brokerage Fee`,
        quantity: 1,
        unitAmount: 0,
        accountCode,
        taxType,
      },
    ];
  }
};

// const buildLineItems = (contract, taxType, accountCode) => {
//   try {
//     if (
//       !contract.items ||
//       !Array.isArray(contract.items) ||
//       contract.items.length === 0
//     ) {
//       return [
//         {
//           description:
//             contract.description || `Contract ${contract.contractNumber}`,
//           quantity: 1,
//           unitAmount: contract.priceExGST || 0,
//           accountCode,
//           taxType,
//         },
//       ];
//     }

//     return contract.items.map((item) => ({
//       description: item.description || "Item",
//       quantity: item.quantity || 1,
//       unitAmount: item.unitPrice || 0,
//       accountCode,
//       taxType,
//     }));
//   } catch (err) {
//     console.error("⚠️ Failed to build line items:", err.message);
//     throw new Error("Failed to build invoice line items.");
//   }
// };

// Find or Create Contact
const findOrCreateContact = async (
  xero,
  tenantId,
  recipient,
  recipientType = "buyer"
) => {
  const name =
    recipientType === "seller" ? recipient.legalName : recipient.name;
  const email = recipient.email;

  try {
    // Validate recipient information first
    if (!recipient) {
      throw new Error(`${recipientType} object is null or undefined`);
    }

    if (!email || typeof email !== "string" || !email.trim()) {
      throw new Error(`Invalid ${recipientType} email: ${email}`);
    }

    if (!name || typeof name !== "string" || !name.trim()) {
      throw new Error(`Invalid ${recipientType} name: ${name}`);
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    // Step 1: Try to find existing contact by email
    let searchResponse;
    try {
      searchResponse = await xero.accountingApi.getContacts(
        tenantId,
        undefined,
        `EmailAddress=="${cleanEmail}"`
      );
    } catch (searchError) {
      // Continue to create new contact
      searchResponse = null;
    }

    // Step 2: If found, return existing contact ID
    if (searchResponse?.body?.contacts?.length > 0) {
      const existing = searchResponse.body.contacts[0];

      // Validate UUID format
      if (
        existing.contactID &&
        /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/i.test(
          existing.contactID
        )
      ) {
        return existing.contactID;
      }
    }

    // Step 3: Create new contact if not found
    const nameParts = cleanName.split(" ");
    const firstName = nameParts[0] || cleanName;
    const lastName = nameParts.slice(1).join(" ") || "";

    const payload = {
      contacts: [
        {
          name: cleanName,
          emailAddress: cleanEmail,
          contactPersons: firstName
            ? [
                {
                  firstName: firstName,
                  lastName: lastName,
                  emailAddress: cleanEmail,
                },
              ]
            : undefined,
        },
      ],
    };

    let created;
    try {
      created = await xero.accountingApi.createContacts(
        tenantId,
        payload,
        false
      );
    } catch (createError) {
      throw createError;
    }

    const newContact = created?.body?.contacts?.[0];

    if (!newContact) {
      throw new Error("No contact returned from Xero API after creation");
    }

    if (!newContact.contactID) {
      throw new Error("Contact created but no contactID returned");
    }

    if (
      !/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/i.test(
        newContact.contactID
      )
    ) {
      throw new Error(`Invalid contactID format: ${newContact.contactID}`);
    }

    return newContact.contactID;
  } catch (err) {
    // Provide detailed error message
    let errorMessage = `Failed to find or create ${recipientType} contact in Xero`;

    if (err.response?.body) {
      const xeroError = err.response.body;
      if (xeroError.Elements?.[0]?.ValidationErrors?.[0]?.Message) {
        errorMessage += `: ${xeroError.Elements[0].ValidationErrors[0].Message}`;
      } else if (xeroError.Message) {
        errorMessage += `: ${xeroError.Message}`;
      }
    } else if (
      err.message &&
      !err.message.includes("Failed to find or create")
    ) {
      errorMessage += `: ${err.message}`;
    }

    throw new Error(errorMessage);
  }
};

module.exports = {
  xero,
  getXeroAuthUrl,
  getXeroAccessToken,
  getXeroTenantId,
  isXeroConnected,
  getDefaultTaxType,
  getDefaultRevenueAccount,
  buildLineItems,
  findOrCreateContact,
};
