const XeroToken = require("../models/XeroToken");
const Contract = require("../models/Contract");
const {
  getXeroAuthUrl,
  xero,
  getXeroAccessToken,
  getXeroTenantId,
  isXeroConnected,
  getDefaultTaxType,
  getDefaultRevenueAccount,
  buildLineItems,
  findOrCreateContact,
} = require("../utils/xero");
const { Invoice, Contact, LineItem, LineAmountTypes } = require("xero-node");

exports.authorize = async (req, res) => {
  try {
    const authUrl = await getXeroAuthUrl();
    res.redirect(authUrl);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Failed to generate authorization URL" });
  }
};

exports.callback = async (req, res) => {
  try {
    const url = `${req.protocol}://${req.get("host")}${req.originalUrl}`;

    const tokenSet = await xero.apiCallback(url);

    if (!tokenSet.access_token || !tokenSet.refresh_token) {
      throw new Error("Failed to get tokens from Xero");
    }

    await xero.updateTenants(false);
    const tenants = xero.tenants;

    if (!tenants || tenants.length === 0) {
      throw new Error("No Xero organizations found");
    }
    const tenant = tenants[0];

    // Calculate expiry time
    const expiresAt = new Date();
    expiresAt.setSeconds(
      expiresAt.getSeconds() + (tokenSet.expires_in || 1800)
    );

    // Clear old tokens
    await XeroToken.deleteMany({});

    // Save new token
    const savedToken = await XeroToken.create({
      accessToken: tokenSet.access_token,
      refreshToken: tokenSet.refresh_token,
      expiresAt: expiresAt,
      tenantId: tenant.tenantId,
      tenantName: tenant.tenantName,
      idToken: tokenSet.id_token,
      updatedAt: new Date(),
    });

    // Verify token was saved
    const verification = await XeroToken.findById(savedToken._id);

    if (!verification) {
      throw new Error("Failed to verify token storage");
    }

    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Xero Authorization Successful</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
            }
            .container {
              text-align: center;
              padding: 2rem;
              background: rgba(255, 255, 255, 0.1);
              border-radius: 10px;
              backdrop-filter: blur(10px);
            }
            .success-icon {
              font-size: 4rem;
              margin-bottom: 1rem;
              animation: scaleIn 0.5s ease-out;
            }
            @keyframes scaleIn {
              from { transform: scale(0); }
              to { transform: scale(1); }
            }
            h1 { margin: 0 0 0.5rem 0; }
            p { margin: 0; opacity: 0.9; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="success-icon">✓</div>
            <h1>Successfully Connected!</h1>
            <p>Xero has been authorized. This window will close automatically...</p>
          </div>
          <script>
            // Notify parent window
            if (window.opener) {
              window.opener.postMessage('xero_authorized', '*');
            }
            
            // Close window after a short delay
            setTimeout(() => {
              window.close();
            }, 1500);
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Xero Authorization Failed</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
              color: white;
            }
            .container {
              text-align: center;
              padding: 2rem;
              background: rgba(255, 255, 255, 0.1);
              border-radius: 10px;
              backdrop-filter: blur(10px);
              max-width: 400px;
            }
            .error-icon {
              font-size: 4rem;
              margin-bottom: 1rem;
              animation: shake 0.5s ease-out;
            }
            @keyframes shake {
              0%, 100% { transform: translateX(0); }
              25% { transform: translateX(-10px); }
              75% { transform: translateX(10px); }
            }
            h1 { margin: 0 0 0.5rem 0; }
            p { margin: 0.5rem 0; opacity: 0.9; font-size: 0.9rem; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="error-icon">✗</div>
            <h1>Authorization Failed</h1>
            <p>${error.message || "An error occurred during authorization"}</p>
            <p>This window will close automatically...</p>
          </div>
          <script>
            // Notify parent window of error
            if (window.opener) {
              window.opener.postMessage({
                type: 'xero_auth_failed',
                message: '${
                  error.message?.replace(/'/g, "\\'") || "Authorization failed"
                }'
              }, '*');
            }
            
            // Close window after delay
            setTimeout(() => {
              window.close();
            }, 3000);
          </script>
        </body>
      </html>
    `);
  }
};

// ONLY REPLACE THIS FUNCTION in xeroController.js

exports.getStatus = async (req, res) => {
  try {
    console.log("🔍 Checking Xero connection status...");

    const tokenData = await XeroToken.findOne().sort({ updatedAt: -1 });

    // No token exists
    if (!tokenData || !tokenData.accessToken || !tokenData.refreshToken) {
      console.log("❌ No token found in database");
      return res.status(200).json({
        data: {
          connected: false,
        },
      });
    }

    // ✅ CHECK TOKEN EXPIRY
    const now = new Date();
    const expiresAt = new Date(tokenData.expiresAt);
    const bufferTime = 5 * 60 * 1000; // 5 minutes buffer
    const isExpired = now.getTime() >= expiresAt.getTime() - bufferTime;

    console.log("Token Status:");
    console.log("- Expires at:", expiresAt.toISOString());
    console.log("- Current time:", now.toISOString());
    console.log("- Is expired:", isExpired);

    if (isExpired) {
      console.log("⚠️ Token expired or expiring soon, attempting refresh...");

      try {
        // Attempt to refresh the token
        const { refreshXeroToken } = require("../utils/xero");
        const newTokenSet = await refreshXeroToken();

        if (newTokenSet && newTokenSet.access_token) {
          console.log("✅ Token refreshed successfully");

          // Get updated token data
          const updatedTokenData = await XeroToken.findOne().sort({
            updatedAt: -1,
          });

          return res.status(200).json({
            data: {
              connected: true,
              tenantName: updatedTokenData?.tenantName,
              connectedAt: updatedTokenData?.updatedAt,
            },
          });
        } else {
          throw new Error("Token refresh returned invalid data");
        }
      } catch (refreshError) {
        console.error("❌ Token refresh failed:", refreshError.message);

        // Token cannot be refreshed - user needs to reconnect
        return res.status(200).json({
          data: {
            connected: false,
            requiresReconnection: true,
            message: "Token expired and refresh failed. Please reconnect.",
          },
        });
      }
    }

    // Token is valid and not expired
    console.log("✅ Token is valid");
    return res.status(200).json({
      data: {
        connected: true,
        tenantName: tokenData?.tenantName,
        connectedAt: tokenData?.updatedAt,
      },
    });
  } catch (error) {
    console.error("❌ Error checking Xero status:", error);
    res.status(500).json({
      error: "Failed to check Xero connection status",
      data: {
        connected: false,
      },
    });
  }
};

// exports.getStatus = async (req, res) => {
//   try {
//     const connected = await isXeroConnected();

//     if (connected) {
//       const tokenData = await XeroToken.findOne().sort({ updatedAt: -1 });

//       return res.status(200).json({
//         data: {
//           connected: true,
//           tenantName: tokenData?.tenantName,
//           connectedAt: tokenData?.updatedAt,
//         },
//       });
//     }

//     return res.status(200).json({
//       data: {
//         connected: false,
//       },
//     });
//   } catch (error) {
//     console.log(error);
//     res.status(500).json({ error: "Failed to check Xero connection status" });
//   }
// };

exports.createInvoice = async (req, res) => {
  try {
    const { contractIds, contractId, invoiceDate, dueDate, reference, notes } =
      req.body;

    let contractIdArray;

    if (contractIds) {
      contractIdArray = Array.isArray(contractIds)
        ? contractIds
        : [contractIds];
    } else if (contractId) {
      contractIdArray = [contractId];
    } else {
      return res.status(400).json({
        message:
          "Contract ID is required. Please provide either 'contractId' or 'contractIds'",
      });
    }

    if (contractIdArray.length === 0) {
      return res.status(400).json({
        message: "At least one contract ID is required",
      });
    }

    const contracts = await Contract.find({
      _id: { $in: contractIdArray },
    }).populate("buyer seller");

    if (!contracts || contracts.length === 0) {
      return res.status(404).json({
        message: "Contract(s) not found",
      });
    }

    // Check if contracts already have an invoice
    const existingInvoiceId = contracts[0]?.xeroInvoiceId;
    const allContractsHaveSameInvoice =
      existingInvoiceId &&
      existingInvoiceId.trim() !== "" &&
      contracts.every(
        (c) => c.xeroInvoiceId && c.xeroInvoiceId === existingInvoiceId
      );

    // Determine invoice recipient based on brokeragePayableBy
    const firstContract = contracts[0];
    const brokeragePayableBy =
      firstContract.brokeragePayableBy?.toLowerCase() || "buyer";

    let invoiceRecipient;
    let recipientType;

    if (brokeragePayableBy.includes("seller")) {
      recipientType = "seller";
      invoiceRecipient = firstContract.seller;

      if (!invoiceRecipient?.email || !invoiceRecipient?.legalName) {
        return res.status(400).json({
          message:
            "Seller information is incomplete. Name and email are required.",
          sellerInfo: {
            hasName: !!invoiceRecipient?.legalName,
            hasEmail: !!invoiceRecipient?.email,
          },
        });
      }

      const sameSeller = contracts.every(
        (c) =>
          c.seller?.email?.toLowerCase().trim() ===
          invoiceRecipient.email?.toLowerCase().trim()
      );

      if (!sameSeller && contracts.length > 1) {
        return res.status(400).json({
          message:
            "All contracts must have the same seller when brokerage is payable by seller.",
          sellers: contracts.map((c) => ({
            contractNumber: c.contractNumber,
            sellerName: c.seller?.legalName,
            sellerEmail: c.seller?.email,
          })),
        });
      }
    } else {
      recipientType = "buyer";
      invoiceRecipient = firstContract.buyer;

      if (!invoiceRecipient?.email || !invoiceRecipient?.name) {
        return res.status(400).json({
          message:
            "Buyer information is incomplete. Name and email are required.",
          buyerInfo: {
            hasName: !!invoiceRecipient?.name,
            hasEmail: !!invoiceRecipient?.email,
          },
        });
      }

      const sameBuyer = contracts.every(
        (c) =>
          c.buyer?.email?.toLowerCase().trim() ===
          invoiceRecipient.email?.toLowerCase().trim()
      );

      if (!sameBuyer && contracts.length > 1) {
        return res.status(400).json({
          message:
            "All contracts must have the same buyer when brokerage is payable by buyer.",
          buyers: contracts.map((c) => ({
            contractNumber: c.contractNumber,
            buyerName: c.buyer?.name,
            buyerEmail: c.buyer?.email,
          })),
        });
      }
    }

    // Ensure xero client is initialized
    if (!xero) {
      throw new Error("Xero client is not initialized");
    }

    // Get token set
    let tokenSet;
    try {
      tokenSet = await getXeroAccessToken();
    } catch (error) {
      console.error("Error getting access token:", error.message);
      return res.status(401).json({
        success: false,
        message: "Xero connection expired. Please reconnect to Xero.",
        error: "TOKEN_EXPIRED",
        requiresReconnection: true,
      });
    }

    const tenantId = await getXeroTenantId();

    if (!tokenSet || !tokenSet.access_token || !tenantId) {
      return res.status(401).json({
        success: false,
        message:
          "Xero authentication credentials are missing. Please reconnect to Xero.",
        error: "NO_CREDENTIALS",
        requiresReconnection: true,
      });
    }

    // Check if token needs refresh (5 min buffer)
    const now = new Date();
    const expiresAt = new Date(tokenSet.expires_at);
    const bufferTime = 5 * 60 * 1000; // 5 minutes

    if (now.getTime() >= expiresAt.getTime() - bufferTime) {
      console.log("Token expired or expiring soon, refreshing...");

      try {
        const { refreshXeroToken } = require("../utils/xero");
        tokenSet = await refreshXeroToken();
        console.log("✅ Token refreshed successfully");
      } catch (refreshError) {
        console.error("❌ Token refresh failed:", refreshError.message);

        // If refresh fails, token is completely expired - user needs to reconnect
        return res.status(401).json({
          success: false,
          message:
            "Xero session expired. Please reconnect to Xero to continue.",
          error: "REFRESH_TOKEN_EXPIRED",
          requiresReconnection: true,
        });
      }
    }

    // Set the token set on xero client
    xero.setTokenSet(tokenSet);

    const [taxType, accountCode] = await Promise.all([
      getDefaultTaxType(xero, tenantId),
      getDefaultRevenueAccount(xero, tenantId),
    ]);

    let contactId;
    try {
      contactId = await findOrCreateContact(
        xero,
        tenantId,
        invoiceRecipient,
        recipientType
      );
    } catch (contactError) {
      throw new Error(
        `Failed to find or create Xero contact: ${contactError.message}`
      );
    }

    if (!contactId) {
      return res.status(400).json({
        message: "Failed to find or create Xero contact.",
        recipientInfo: {
          type: recipientType,
          name:
            recipientType === "seller"
              ? invoiceRecipient.legalName
              : invoiceRecipient.name,
          email: invoiceRecipient.email,
        },
      });
    }

    const allLineItems = [];
    let totalAmount = 0;

    for (const contract of contracts) {
      const lineItemsData = buildLineItems(contract, taxType, accountCode);

      const contractAmount = lineItemsData.reduce(
        (sum, item) => sum + (item.quantity || 1) * (item.unitAmount || 0),
        0
      );

      totalAmount += contractAmount;
      allLineItems.push(...lineItemsData);
    }

    if (totalAmount === 0) {
      return res.status(400).json({
        message:
          "Invoice amount cannot be zero. Please check contract pricing.",
      });
    }

    const invoice = new Invoice();
    invoice.type = Invoice.TypeEnum.ACCREC;
    invoice.contact = new Contact();
    invoice.contact.contactID = contactId;
    invoice.date = invoiceDate || new Date().toISOString().split("T")[0];
    invoice.dueDate =
      dueDate ||
      (() => {
        const due = new Date(invoiceDate || new Date());
        due.setDate(due.getDate() + 30);
        return due.toISOString().split("T")[0];
      })();

    invoice.reference =
      reference ||
      (contracts.length === 1
        ? `Contract ${contracts[0].contractNumber}`
        : `Brokerage Invoice - ${contracts.length} contracts`);

    invoice.lineAmountTypes = LineAmountTypes.Exclusive;
    invoice.status = Invoice.StatusEnum.DRAFT;

    if (notes) {
      invoice.notes = notes;
    }

    invoice.lineItems = allLineItems.map((item) => {
      const lineItem = new LineItem();
      lineItem.description = item.description;
      lineItem.quantity = item.quantity;
      lineItem.unitAmount = item.unitAmount;
      lineItem.accountCode = item.accountCode;
      lineItem.taxType = item.taxType;
      return lineItem;
    });

    let invoiceResponse;
    let isUpdate = false;
    let existingInvoiceStatus = null;

    // ALWAYS USE PUT (updateOrCreateInvoices) - This is the key change
    if (allContractsHaveSameInvoice) {
      try {
        console.log(`Checking existing invoice: ${existingInvoiceId}`);

        // First, try to fetch the existing invoice to check its status
        let existingInvoiceData = null;
        try {
          const existingInvoiceResponse = await xero.accountingApi.getInvoice(
            tenantId,
            existingInvoiceId
          );
          existingInvoiceData = existingInvoiceResponse.body.invoices?.[0];
          existingInvoiceStatus = existingInvoiceData?.status;
          console.log(`Existing invoice status: ${existingInvoiceStatus}`);
        } catch (fetchError) {
          console.log("Could not fetch existing invoice, will create new one");
          existingInvoiceData = null;
        }

        // Check if invoice can be updated
        if (
          existingInvoiceData &&
          (existingInvoiceStatus === "DRAFT" ||
            existingInvoiceStatus === "SUBMITTED")
        ) {
          // Invoice exists and can be updated - use PUT with existing ID
          console.log(
            `Updating existing invoice ${existingInvoiceId} using PUT`
          );
          invoice.invoiceID = existingInvoiceId;

          const invoices = { invoices: [invoice] };
          invoiceResponse = await xero.accountingApi.updateOrCreateInvoices(
            tenantId,
            invoices,
            false, // summarizeErrors
            false // unitdp
          );

          isUpdate = true;
          console.log("✅ Invoice updated successfully using PUT");
        } else if (
          existingInvoiceData &&
          (existingInvoiceStatus === "AUTHORISED" ||
            existingInvoiceStatus === "PAID" ||
            existingInvoiceStatus === "VOIDED")
        ) {
          // Invoice is locked, cannot update
          return res.status(400).json({
            success: false,
            message: `Cannot update invoice. Invoice is already ${existingInvoiceStatus}. Only DRAFT or SUBMITTED invoices can be updated.`,
            data: {
              existingInvoiceId: existingInvoiceId,
              invoiceNumber: existingInvoiceData.invoiceNumber,
              invoiceStatus: existingInvoiceStatus,
              xeroUrl: `https://go.xero.com/AccountsReceivable/View.aspx?InvoiceID=${existingInvoiceId}`,
            },
          });
        } else {
          // Invoice doesn't exist or couldn't be fetched - use PUT to create new
          console.log(
            "Creating new invoice using PUT (invoice ID was invalid)"
          );

          // Clear invalid invoice reference from contracts
          await Contract.updateMany(
            { _id: { $in: contractIdArray } },
            { $unset: { xeroInvoiceId: "", xeroInvoiceNumber: "" } }
          );

          // Don't set invoiceID, let Xero create a new one
          const invoices = { invoices: [invoice] };
          invoiceResponse = await xero.accountingApi.updateOrCreateInvoices(
            tenantId,
            invoices,
            false,
            false
          );

          isUpdate = false;
          console.log("✅ New invoice created using PUT");
        }
      } catch (error) {
        console.error("Error in PUT operation:", error.message);

        // If PUT fails, clear the invalid reference and try again
        await Contract.updateMany(
          { _id: { $in: contractIdArray } },
          { $unset: { xeroInvoiceId: "", xeroInvoiceNumber: "" } }
        );

        // Retry with PUT to create new invoice
        console.log("Retrying with PUT to create new invoice");
        const invoices = { invoices: [invoice] };
        invoiceResponse = await xero.accountingApi.updateOrCreateInvoices(
          tenantId,
          invoices,
          false,
          false
        );
        isUpdate = false;
      }
    } else {
      // No existing invoice - use PUT to create new one
      console.log("Creating new invoice using PUT (no existing invoice)");
      const invoices = { invoices: [invoice] };
      invoiceResponse = await xero.accountingApi.updateOrCreateInvoices(
        tenantId,
        invoices,
        false,
        false
      );
      isUpdate = false;
    }

    const createdInvoice = invoiceResponse.body.invoices?.[0];

    if (!createdInvoice?.invoiceID) {
      throw new Error(
        `Failed to ${
          isUpdate ? "update" : "create"
        } invoice - no invoice returned from Xero`
      );
    }

    // Update contracts with the invoice information
    await Contract.updateMany(
      { _id: { $in: contractIdArray } },
      {
        xeroInvoiceId: createdInvoice.invoiceID,
        xeroInvoiceNumber: createdInvoice.invoiceNumber,
        status: "Invoiced",
      }
    );

    return res.status(200).json({
      success: true,
      message:
        contracts.length === 1
          ? `Invoice ${isUpdate ? "updated" : "created"} successfully in Xero`
          : `Invoice ${
              isUpdate ? "updated" : "created"
            } successfully in Xero for ${contracts.length} contracts`,
      data: {
        invoiceId: createdInvoice.invoiceID,
        invoiceNumber: createdInvoice.invoiceNumber,
        xeroUrl: `https://go.xero.com/AccountsReceivable/View.aspx?InvoiceID=${createdInvoice.invoiceID}`,
        total: createdInvoice.total,
        totalTax: createdInvoice.totalTax,
        amountDue: createdInvoice.amountDue,
        status: createdInvoice.status,
        contractCount: contracts.length,
        contractNumbers: contracts.map((c) => c.contractNumber),
        recipientType: recipientType,
        recipientName:
          recipientType === "seller"
            ? invoiceRecipient.legalName
            : invoiceRecipient.name,
        isUpdate: isUpdate,
      },
    });
  } catch (error) {
    console.error("Error in createInvoice:", error);

    // Check if error is related to authentication/authorization
    const isAuthError =
      error.message?.toLowerCase().includes("token") ||
      error.message?.toLowerCase().includes("unauthorized") ||
      error.message?.toLowerCase().includes("expired") ||
      error.response?.statusCode === 401 ||
      error.response?.statusCode === 403;

    if (isAuthError) {
      return res.status(401).json({
        success: false,
        message: "Xero session expired. Please reconnect to Xero to continue.",
        error: "AUTHENTICATION_ERROR",
        requiresReconnection: true,
      });
    }

    const errorMessage =
      error.response?.body?.Elements?.[0]?.ValidationErrors?.[0]?.Message ||
      error.response?.body?.Message ||
      error.message ||
      "Failed to create invoice in Xero";

    return res.status(error.response?.statusCode || 500).json({
      success: false,
      message: errorMessage,
      error:
        process.env.NODE_ENV === "development"
          ? error.response?.body || error.message
          : undefined,
    });
  }
};
