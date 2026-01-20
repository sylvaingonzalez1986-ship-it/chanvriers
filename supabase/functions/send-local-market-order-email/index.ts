import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';
const COMPANY_EMAIL = 'leschanvriersbretons@gmail.com';

interface LocalMarketOrderEmailRequest {
  orderId: string;
  producerEmail: string;
  producerName: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  pickupCode: string;
  pickupLocation?: string;
  pickupInstructions?: string;
  customerNotes?: string;
}

// Fonction pour envoyer un email via Resend
async function sendEmail(
  to: string,
  subject: string,
  html: string,
  cc?: string[]
): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY not configured');
    return false;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'noreply@leschanvriersbretons.fr',
        to,
        cc: cc || [],
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Resend API error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Email sending error:', error);
    return false;
  }
}

// Générer le HTML de l'email pour le producteur
function generateProducerEmailHTML(data: LocalMarketOrderEmailRequest): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #2d5016 0%, #4a7c23 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
          .header h1 { margin: 0 0 10px 0; font-size: 24px; }
          .header p { margin: 0; opacity: 0.9; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
          .pickup-code { background: linear-gradient(135deg, #D4A853 0%, #E8C97A 100%); color: #1a2744; padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0; }
          .pickup-code .label { font-size: 14px; margin-bottom: 5px; opacity: 0.8; }
          .pickup-code .code { font-size: 36px; font-weight: bold; letter-spacing: 8px; }
          .section { margin-bottom: 25px; }
          .section-title { font-size: 16px; font-weight: bold; color: #2d5016; margin-bottom: 10px; border-bottom: 2px solid #2d5016; padding-bottom: 5px; }
          .info-box { background: #f9f9f9; padding: 15px; border-left: 4px solid #2d5016; border-radius: 0 8px 8px 0; }
          .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
          .info-row:last-child { border-bottom: none; }
          .info-label { color: #666; }
          .info-value { font-weight: 600; color: #333; }
          .total-box { background: #2d5016; color: white; padding: 15px 20px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; }
          .total-box .label { font-size: 16px; }
          .total-box .amount { font-size: 24px; font-weight: bold; }
          .notes-box { background: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107; }
          .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; padding: 20px; border-top: 1px solid #e0e0e0; }
          .action-notice { background: #e8f5e9; padding: 15px; border-radius: 8px; text-align: center; margin-top: 20px; }
          .action-notice strong { color: #2d5016; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Nouvelle commande Marché Local</h1>
            <p>Commande #${data.orderId.slice(0, 8)}</p>
          </div>

          <div class="content">
            <div class="pickup-code">
              <div class="label">CODE DE RETRAIT CLIENT</div>
              <div class="code">${data.pickupCode}</div>
            </div>

            <div class="section">
              <div class="section-title">Détails de la commande</div>
              <div class="info-box">
                <div class="info-row">
                  <span class="info-label">Produit</span>
                  <span class="info-value">${data.productName}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Quantité</span>
                  <span class="info-value">${data.quantity}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Prix unitaire</span>
                  <span class="info-value">${data.unitPrice.toFixed(2)} €</span>
                </div>
              </div>
              <div class="total-box" style="margin-top: 15px;">
                <span class="label">Total à encaisser</span>
                <span class="amount">${data.totalAmount.toFixed(2)} €</span>
              </div>
            </div>

            <div class="section">
              <div class="section-title">Informations client</div>
              <div class="info-box">
                <div class="info-row">
                  <span class="info-label">Nom</span>
                  <span class="info-value">${data.customerName}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Email</span>
                  <span class="info-value">${data.customerEmail}</span>
                </div>
                ${data.customerPhone ? `
                <div class="info-row">
                  <span class="info-label">Téléphone</span>
                  <span class="info-value">${data.customerPhone}</span>
                </div>
                ` : ''}
              </div>
            </div>

            ${data.customerNotes ? `
            <div class="section">
              <div class="section-title">Message du client</div>
              <div class="notes-box">
                <em>"${data.customerNotes}"</em>
              </div>
            </div>
            ` : ''}

            <div class="action-notice">
              <strong>Action requise:</strong> Préparez la commande et attendez le client avec le code <strong>${data.pickupCode}</strong>.<br>
              Le paiement s'effectue sur place lors du retrait.
            </div>
          </div>

          <div class="footer">
            <p>Cet email a été généré automatiquement par Les Chanvriers Unis - Marché Local</p>
            <p>Ne répondez pas à cet email. Pour contacter le client, utilisez: ${data.customerEmail}</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

// Générer le HTML de l'email de confirmation pour le client
function generateCustomerEmailHTML(data: LocalMarketOrderEmailRequest): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #1a2744 0%, #2d3f66 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
          .header h1 { margin: 0 0 10px 0; font-size: 24px; }
          .header p { margin: 0; opacity: 0.9; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
          .pickup-code { background: linear-gradient(135deg, #D4A853 0%, #E8C97A 100%); color: #1a2744; padding: 25px; border-radius: 12px; text-align: center; margin: 20px 0; }
          .pickup-code .label { font-size: 14px; margin-bottom: 8px; opacity: 0.8; }
          .pickup-code .code { font-size: 42px; font-weight: bold; letter-spacing: 10px; }
          .pickup-code .note { font-size: 12px; margin-top: 10px; opacity: 0.8; }
          .section { margin-bottom: 25px; }
          .section-title { font-size: 16px; font-weight: bold; color: #2d5016; margin-bottom: 10px; border-bottom: 2px solid #2d5016; padding-bottom: 5px; }
          .info-box { background: #f9f9f9; padding: 15px; border-left: 4px solid #2d5016; border-radius: 0 8px 8px 0; }
          .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
          .info-row:last-child { border-bottom: none; }
          .info-label { color: #666; }
          .info-value { font-weight: 600; color: #333; }
          .total-box { background: #2d5016; color: white; padding: 15px 20px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; }
          .total-box .label { font-size: 16px; }
          .total-box .amount { font-size: 24px; font-weight: bold; }
          .payment-notice { background: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107; text-align: center; margin: 20px 0; }
          .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; padding: 20px; border-top: 1px solid #e0e0e0; }
          .success-icon { font-size: 48px; margin-bottom: 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="success-icon">✓</div>
            <h1>Commande confirmée !</h1>
            <p>Merci pour votre commande chez ${data.producerName}</p>
          </div>

          <div class="content">
            <div class="pickup-code">
              <div class="label">VOTRE CODE DE RETRAIT</div>
              <div class="code">${data.pickupCode}</div>
              <div class="note">Présentez ce code au producteur lors du retrait</div>
            </div>

            <div class="section">
              <div class="section-title">Récapitulatif de votre commande</div>
              <div class="info-box">
                <div class="info-row">
                  <span class="info-label">Produit</span>
                  <span class="info-value">${data.productName}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Quantité</span>
                  <span class="info-value">${data.quantity}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Prix unitaire</span>
                  <span class="info-value">${data.unitPrice.toFixed(2)} €</span>
                </div>
              </div>
              <div class="total-box" style="margin-top: 15px;">
                <span class="label">Total à payer sur place</span>
                <span class="amount">${data.totalAmount.toFixed(2)} €</span>
              </div>
            </div>

            <div class="section">
              <div class="section-title">Lieu de retrait</div>
              <div class="info-box">
                <div class="info-row">
                  <span class="info-label">Producteur</span>
                  <span class="info-value">${data.producerName}</span>
                </div>
                ${data.pickupLocation ? `
                <div class="info-row">
                  <span class="info-label">Adresse</span>
                  <span class="info-value">${data.pickupLocation}</span>
                </div>
                ` : ''}
                ${data.pickupInstructions ? `
                <div class="info-row">
                  <span class="info-label">Instructions</span>
                  <span class="info-value">${data.pickupInstructions}</span>
                </div>
                ` : ''}
              </div>
            </div>

            <div class="payment-notice">
              <strong>💰 Paiement sur place</strong><br>
              Le paiement s'effectue directement auprès du producteur lors du retrait de votre commande.
            </div>
          </div>

          <div class="footer">
            <p>Merci d'utiliser le Marché Local des Chanvriers Unis !</p>
            <p>Pour toute question, contactez le producteur: ${data.producerEmail}</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

serve(async (req: Request) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Vérifier la méthode
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const data = await req.json() as LocalMarketOrderEmailRequest;

    // Validation
    if (!data.orderId || !data.producerEmail || !data.customerEmail || !data.pickupCode) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[send-local-market-order-email] Processing order:', data.orderId);

    // Générer les emails
    const producerEmailHTML = generateProducerEmailHTML(data);
    const customerEmailHTML = generateCustomerEmailHTML(data);

    // Envoyer l'email au producteur avec CC au company email
    const producerEmailSent = await sendEmail(
      data.producerEmail,
      `🛒 Nouvelle commande Marché Local - Code ${data.pickupCode}`,
      producerEmailHTML,
      [COMPANY_EMAIL]
    );

    if (!producerEmailSent) {
      console.warn('[send-local-market-order-email] Failed to send producer email');
    } else {
      console.log('[send-local-market-order-email] Producer email sent to:', data.producerEmail);
    }

    // Envoyer l'email de confirmation au client
    const customerEmailSent = await sendEmail(
      data.customerEmail,
      `✓ Commande confirmée - Code de retrait: ${data.pickupCode}`,
      customerEmailHTML
    );

    if (!customerEmailSent) {
      console.warn('[send-local-market-order-email] Failed to send customer email');
    } else {
      console.log('[send-local-market-order-email] Customer email sent to:', data.customerEmail);
    }

    return new Response(
      JSON.stringify({
        success: true,
        producerEmailSent,
        customerEmailSent,
        message: 'Emails processed',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[send-local-market-order-email] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
