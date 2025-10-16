const { XeroClient } = require('xero-node');
const XeroToken = require('../models/XeroToken');

// Initialize Xero Client
const xero = new XeroClient({
  clientId: `6030C0D1BF0B42C59AC0056C098BAD87`,
  clientSecret: `QfxeO6UQZb3ZPR_0z1EPMtdXDGhLroFaEFJC9dSYN-C9iKzI`,
  redirectUris: [`http://localhost:8000/api/auth/xero/callback`],
  scopes: [
    'openid',
    'profile',
    'email',
    'accounting.transactions',
    'accounting.contacts',
    'accounting.settings',
    'offline_access',
  ],
});

// Get authorization URL
function getXeroAuthUrl() {
  return xero.buildConsentUrl();
}

// Get valid access token (refresh if needed)
async function getXeroAccessToken() {
  try {
    console.log('🔍 Checking for Xero tokens in database...');
    
    const tokenData = await XeroToken.findOne().sort({ updatedAt: -1 });
    console.log('Token data found:', tokenData ? 'YES' : 'NO');
    
    if (!tokenData) {
      console.error('❌ No token found in database');
      throw new Error('Xero not connected. Please authorize first.');
    }

    console.log('Token details:', {
      tenantName: tokenData.tenantName,
      expiresAt: tokenData.expiresAt,
      hasAccessToken: !!tokenData.accessToken,
      hasRefreshToken: !!tokenData.refreshToken
    });

    // Check if token is expired (with 5 min buffer)
    const now = new Date();
    const expiresAt = new Date(tokenData.expiresAt);
    const bufferTime = 5 * 60 * 1000; // 5 minutes

    if (now.getTime() >= expiresAt.getTime() - bufferTime) {
      console.log('🔄 Token expired, refreshing...');
      
      xero.setTokenSet({
        access_token: tokenData.accessToken,
        refresh_token: tokenData.refreshToken,
        expires_in: 1800,
      });

      const newTokenSet = await xero.refreshToken();
      
      // Update database with new tokens
      const newExpiresAt = new Date();
      newExpiresAt.setSeconds(newExpiresAt.getSeconds() + newTokenSet.expires_in);

      await XeroToken.findByIdAndUpdate(tokenData._id, {
        accessToken: newTokenSet.access_token,
        refreshToken: newTokenSet.refresh_token,
        expiresAt: newExpiresAt,
        updatedAt: new Date(),
      });

      console.log('✅ Token refreshed successfully');
      return newTokenSet.access_token;
    }

    console.log('✅ Using existing valid token');
    return tokenData.accessToken;
  } catch (error) {
    console.error('❌ Error in getXeroAccessToken:', error.message);
    throw error;
  }
}

// Get Xero tenant ID
async function getXeroTenantId() {
  const tokenData = await XeroToken.findOne().sort({ updatedAt: -1 });
  
  if (!tokenData) {
    throw new Error('Xero not connected. Please authorize first.');
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
    const defaultTax = body.taxRates.find(rate => rate.name === 'GST on Income') 
      || body.taxRates.find(rate => rate.taxType === 'OUTPUT') 
      || body.taxRates[0];

    return defaultTax?.taxType || 'NONE';
  } catch (err) {
    console.error('⚠️ Failed to fetch tax type:', err.message);
    return 'NONE';
  }
};


const getDefaultRevenueAccount = async (xero, tenantId) => {
  try {
    const { body } = await xero.accountingApi.getAccounts(tenantId);
    const revenueAccount = body.accounts.find(acc => acc.type === 'REVENUE' && acc.code)
      || body.accounts.find(acc => acc.name?.toLowerCase().includes('sales'))
      || body.accounts[0];

    return revenueAccount?.code || '200';
  } catch (err) {
    console.error('⚠️ Failed to fetch revenue account:', err.message);
    return '200';
  }
};

const buildLineItems = (contract, taxType, accountCode) => {
  try {
    if (!contract.items || !Array.isArray(contract.items) || contract.items.length === 0) {
      return [
        {
          description: contract.description || `Contract ${contract.contractNumber}`,
          quantity: 1,
          unitAmount: contract.priceExGST || 0,
          accountCode,
          taxType,
        },
      ];
    }

    return contract.items.map((item) => ({
      description: item.description || 'Item',
      quantity: item.quantity || 1,
      unitAmount: item.unitPrice || 0,
      accountCode,
      taxType,
    }));
  } catch (err) {
    console.error('⚠️ Failed to build line items:', err.message);
    throw new Error('Failed to build invoice line items.');
  }
};

// --- ✅ Fixed Helper: Find or Create Contact ---
const findOrCreateContact = async (xero, tenantId, buyer) => {
  try {
    // Try to find existing contact by email
    const { body } = await xero.accountingApi.getContacts(
      tenantId,
      undefined,
      `EmailAddress=="${buyer.email}"`
    );

    if (body.contacts?.length > 0) {
      const existing = body.contacts[0];
      if (existing.contactID && /^[0-9a-fA-F-]{36}$/.test(existing.contactID)) {
        console.log('✅ Found existing contact:', existing.name, existing.contactID);
        return existing.contactID;
      }
    }

    // Otherwise, create a new contact
    const payload = {
      contacts: [
        {
          name: buyer.name,
          emailAddress: buyer.email,
          contactPersons: [
            {
              firstName: buyer.name?.split(' ')[0] || buyer.name,
              emailAddress: buyer.email,
            },
          ],
        },
      ],
    };

    const created = await xero.accountingApi.createContacts(tenantId, payload);
    const newContact = created.body.contacts[0];

    console.log('✅ Created new contact:', newContact.name, newContact.contactID);

    if (!newContact?.contactID || !/^[0-9a-fA-F-]{36}$/.test(newContact.contactID)) {
      throw new Error('Invalid contactID returned from Xero');
    }

    return newContact.contactID;
  } catch (err) {
    console.error('⚠️ Failed to find/create contact:', err.response?.body || err.message);
    throw new Error('Failed to find or create buyer contact in Xero.');
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
  findOrCreateContact
};
