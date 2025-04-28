import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

// Initialize Supabase client
const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
// Initialize SendGrid
const SENDGRID_API_KEY = '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';
const SENDGRID_API_URL = 'https://api.sendgrid.com/v3/mail/send';

// Function to send email with the 2FA code
async function send2FACodeEmail(email, code) {
  const message = {
    personalizations: [
      {
        to: [
          {
            email: email
          }
        ],
        subject: 'Your 2FA Code'
      }
    ],
    from: {
      name: '2 FA Test',
      email: 'thurainbowinn@gmail.com'
    },
    content: [
      {
        type: 'text/plain',
        value: `Your 2FA verification code is: ${code}`
      },
      {
        type: 'text/html',
        value: `<p>Your 2FA verification code is: <strong>${code}</strong></p>`
      }
    ]
  };
  // Send the email using SendGrid API
  const response = await fetch(SENDGRID_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SENDGRID_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(message)
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`SendGrid API Error: ${JSON.stringify(errorData)}`);
  }
  console.log(`2FA code sent to ${email}`);
}
// Store the 2FA code in the database
async function store2FACode(email, code) {
  const { data, error } = await supabase.from('2fa_codes') // Assuming this is the table for storing 2FA codes
  .insert([
    {
      email,
      code,
      created_at: new Date().toISOString()
    }
  ]);
  if (error) {
    console.error('Error saving code to database: ', error);
    throw new Error('Failed to store 2FA code');
  }
  console.log('2FA code saved to database');
  return data;
}

Deno.serve(async (req)=>{
  // Parse incoming request
  const { email } = await req.json();
  if (!email) {
    return new Response(JSON.stringify({
      error: 'Email is required'
    }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
  // Generate a random 6-digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  try {
    // Send the 2FA code via email
    await send2FACodeEmail(email, code);
    // Store the 2FA code in the Supabase database
    await store2FACode(email, code);
    // Return a success response
    return new Response(JSON.stringify({
      message: '2FA code sent!'
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error processing 2FA: ', error);
    return new Response(JSON.stringify({
      error: 'Failed to send 2FA code'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
});


/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/send-verification-code' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
