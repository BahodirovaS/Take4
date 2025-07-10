// // (api)/(stripe)/create+api.ts
// import { Stripe } from "stripe";
// import { getOrCreateDriverAccount } from "@/lib/stripeConnect";

// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// export async function POST(request: Request) {
//   try {
//     const body = await request.json();
//     const {
//       name,
//       email,
//       amount,
//       tipAmount = '0',
//       driverCommissionRate = 0.80,
//       driver_id,
//       driver_email
//     } = body;

//     if (!name || !email || !amount || !driver_id || !driver_email) {
//       return new Response(JSON.stringify({ error: "Missing required fields" }), {
//         status: 400,
//       });
//     }

//     const fareAmount = parseFloat(amount);
//     const tipAmountValue = parseFloat(tipAmount);
//     const totalAmount = fareAmount + tipAmountValue;
//     const driverShare = (fareAmount * driverCommissionRate + tipAmountValue);
//     const companyShare = (fareAmount * (1 - driverCommissionRate));

//     // Get or create driver's Connect account
//     const driverConnectAccountId = await getOrCreateDriverAccount(driver_id, driver_email);

//     // Create customer
//     let customer;
//     const doesCustomerExist = await stripe.customers.list({ email });

//     if (doesCustomerExist.data.length > 0) {
//       customer = doesCustomerExist.data[0];
//       if (name && customer.name !== name) {
//         customer = await stripe.customers.update(customer.id, { name });
//       }
//     } else {
//       customer = await stripe.customers.create({ name, email });
//     }

//     const ephemeralKey = await stripe.ephemeralKeys.create(
//       { customer: customer.id },
//       { apiVersion: "2024-06-20" }
//     );

//     // Create payment with Connect
//     const paymentIntent = await stripe.paymentIntents.create({
//       amount: Math.round(totalAmount * 100),
//       currency: "usd",
//       customer: customer.id,
//       application_fee_amount: Math.round(companyShare * 100),
//       transfer_data: {
//         destination: driverConnectAccountId,
//       },
//       automatic_payment_methods: {
//         enabled: true,
//         allow_redirects: "never",
//       },
//       metadata: {
//         fareAmount: amount,
//         tipAmount: tipAmount,
//         driverShare: driverShare.toFixed(2),
//         companyShare: companyShare.toFixed(2),
//         driver_id: driver_id,
//         driver_connect_account: driverConnectAccountId,
//       }
//     });

//     return new Response(
//       JSON.stringify({
//         paymentIntent: paymentIntent,
//         ephemeralKey: ephemeralKey,
//         customer: customer.id,
//         driverConnectAccount: driverConnectAccountId,
//       })
//     );
//   } catch (error) {
//     console.error("Error creating payment:", error);
    
//     let errorMessage = "Internal Server Error";
//     if (error instanceof Stripe.errors.StripeError) {
//       errorMessage = error.message;
//     }
    
//     return new Response(JSON.stringify({ error: errorMessage }), {
//       status: 500,
//     });
//   }
// }