// --- 1. SAAS: INSTITUTION ONBOARDING & MANAGEMENT ---
app.post('/api/institutions/register', async (req, res) => {
  try {
    const { name, code, adminEmail, subscriptionPlan } = req.body;
    
    const existing = await Institution.findOne({ code: code.toLowerCase() });
    if (existing) {
      return res.status(400).json({ message: 'Institution code already exists. Choose another.' });
    }

    const newInstitution = new Institution({
      name,
      code: code.toLowerCase(),
      adminEmail,
      subscriptionPlan: subscriptionPlan || 'BASIC',
      status: 'ACTIVE'
    });

    await newInstitution.save();
    res.status(201).json({ message: 'Institution registered successfully!', institution: newInstitution });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all institutions (For Master Super Admin Panel)
app.get('/api/institutions', async (req, res) => {
  try {
    const institutions = await Institution.find();
    res.json(institutions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Institution Subscription Plan (SaaS Admin Control)
app.put('/api/institutions/subscription/:id', async (req, res) => {
  try {
    const { subscriptionPlan, status, extensionDays } = req.body;
    const institution = await Institution.findById(req.params.id);
    
    if (!institution) {
      return res.status(404).json({ message: 'Institution not found' });
    }

    if (subscriptionPlan) institution.subscriptionPlan = subscriptionPlan;
    if (status) institution.status = status;
    if (extensionDays) {
      const currentExpiry = new Date(institution.expiresAt > Date.now() ? institution.expiresAt : Date.now());
      institution.expiresAt = new Date(currentExpiry.getTime() + Number(extensionDays)*24*60*60*1000);
    }

    await institution.save();
    res.json({ message: 'Subscription updated successfully!', institution });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- 2. TENANT-AWARE ERP ROUTES (Protected by tenantMiddleware) ---

// Get students filtered strictly by institution tenant
app.get('/api/students', tenantMiddleware, async (req, res) => {
  try {
    const students = await Student.find({ institutionId: req.institutionId });
    res.json(students);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get paper submissions filtered strictly by institution tenant
app.get('/api/submissions', tenantMiddleware, async (req, res) => {
  try {
    const submissions = await Submission.find({ institutionId: req.institutionId });
    res.json({ success: true, data: submissions });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
// SaaS Subscription Payment Webhook
app.post('/api/saas/webhook', async (req, res) => {
  try {
    const event = req.body;
    
    // Check for successful payment from Razorpay or Stripe
    if (event.event === 'payment.captured' || event.type === 'invoice.payment_succeeded') {
      const institutionCode = event.payload?.payment?.entity?.notes?.institutionCode || event.data?.object?.metadata?.institutionCode;
      
      if (institutionCode) {
        // Extend subscription by 1 year upon successful payment
        await Institution.findOneAndUpdate(
          { code: institutionCode.toLowerCase() },
          { 
            status: 'ACTIVE', 
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) 
          }
        );
      }
    }
    
    res.json({ received: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});