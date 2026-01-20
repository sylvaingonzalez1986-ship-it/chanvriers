import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface NotifyStatusRequest {
  commandeId: string;
  newStatus: string;
  userId: string;
  producerId: string;
}

// Status labels in French
const STATUS_LABELS: Record<string, string> = {
  en_attente: 'En attente',
  confirmee: 'Confirmée',
  prete: 'Prête pour le retrait',
  recuperee: 'Récupérée',
  annulee: 'Annulée',
};

// Status descriptions for email
const STATUS_DESCRIPTIONS: Record<string, string> = {
  confirmee: 'Votre commande a été confirmée par le producteur. Elle sera bientôt prête pour le retrait.',
  prete: 'Votre commande est prête! Vous pouvez venir la récupérer aux horaires indiqués.',
  recuperee: 'Merci pour votre achat! Votre commande a été récupérée avec succès.',
  annulee: 'Votre commande a été annulée. Si vous avez des questions, contactez le producteur.',
};

// Send email via Resend
async function sendEmail(
  to: string,
  subject: string,
  html: string
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

// Generate status update email HTML
function generateStatusUpdateEmailHTML(
  orderNumber: string,
  newStatus: string,
  producerName: string,
  customerName: string,
  address: string,
  hours: string,
  instructions: string | null
): string {
  const statusLabel = STATUS_LABELS[newStatus] || newStatus;
  const statusDescription = STATUS_DESCRIPTIONS[newStatus] || '';

  // Status color based on type
  const statusColor = {
    en_attente: '#f59e0b',
    confirmee: '#3b82f6',
    prete: '#8b5cf6',
    recuperee: '#22c55e',
    annulee: '#ef4444',
  }[newStatus] || '#6b7280';

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2d5016; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .status-badge { display: inline-block; padding: 8px 16px; border-radius: 20px; font-weight: bold; color: white; }
          .section { margin-bottom: 20px; }
          .section-title { font-size: 18px; font-weight: bold; margin-bottom: 10px; color: #2d5016; }
          .info-box { background-color: #f9f9f9; padding: 15px; border-left: 4px solid #2d5016; margin: 10px 0; }
          .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Mise à jour de votre commande</h1>
            <p>Commande #${orderNumber}</p>
          </div>

          <div class="section">
            <p>Bonjour ${customerName},</p>
            <p>Le statut de votre commande chez <strong>${producerName}</strong> a été mis à jour.</p>
          </div>

          <div class="section" style="text-align: center;">
            <div class="status-badge" style="background-color: ${statusColor};">
              ${statusLabel}
            </div>
            <p style="margin-top: 15px;">${statusDescription}</p>
          </div>

          ${newStatus === 'prete' || newStatus === 'confirmee' ? `
          <div class="section">
            <div class="section-title">Informations de retrait</div>
            <div class="info-box">
              <p><strong>Producteur:</strong> ${producerName}</p>
              <p><strong>Adresse:</strong> ${address}</p>
              <p><strong>Horaires:</strong> ${hours}</p>
              ${instructions ? `<p><strong>Instructions:</strong> ${instructions}</p>` : ''}
            </div>
          </div>
          ` : ''}

          ${newStatus === 'annulee' ? `
          <div class="section">
            <div class="info-box" style="border-left-color: #ef4444;">
              <p>Si vous avez des questions concernant cette annulation, n'hésitez pas à contacter directement le producteur.</p>
            </div>
          </div>
          ` : ''}

          <div class="footer">
            <p>Merci d'utiliser le Marché Local des Chanvriers Unis!</p>
            <p>Cet email a été généré automatiquement.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

serve(async (req: Request) => {
  // Check method
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();
    const { commandeId, newStatus, userId, producerId } = body as NotifyStatusRequest;

    if (!commandeId || !newStatus || !userId || !producerId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Fetch order data
    const { data: orderData, error: orderError } = await supabase
      .from('commandes_vente_directe')
      .select('*')
      .eq('id', commandeId)
      .single();

    if (orderError || !orderData) {
      console.error('Order not found:', orderError);
      return new Response(JSON.stringify({ error: 'Order not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Fetch producer info
    const { data: producerData, error: producerError } = await supabase
      .from('producers')
      .select('id, name')
      .eq('id', producerId)
      .single();

    if (producerError || !producerData) {
      console.error('Producer not found:', producerError);
      return new Response(JSON.stringify({ error: 'Producer not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Fetch customer info
    const { data: userProfile, error: userError } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name')
      .eq('id', userId)
      .single();

    if (userError || !userProfile) {
      console.error('User profile not found:', userError);
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const customerName = `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() || 'Client';
    const customerEmail = userProfile.email || '';

    if (!customerEmail) {
      console.warn('Customer email not found, skipping notification');
      return new Response(
        JSON.stringify({ success: true, emailSent: false, reason: 'No customer email' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Generate email HTML
    const emailHTML = generateStatusUpdateEmailHTML(
      commandeId.slice(0, 8).toUpperCase(),
      newStatus,
      producerData.name,
      customerName,
      orderData.adresse_retrait,
      orderData.horaires_retrait,
      orderData.instructions_retrait
    );

    // Send email
    const emailSent = await sendEmail(
      customerEmail,
      `Mise à jour commande #${commandeId.slice(0, 8).toUpperCase()} - ${STATUS_LABELS[newStatus] || newStatus}`,
      emailHTML
    );

    return new Response(
      JSON.stringify({
        success: true,
        emailSent,
        message: emailSent ? 'Notification sent successfully' : 'Failed to send notification',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
