
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { adminDb } from '@/firebase/server'; // We need admin-sdk to bypass rules and update user

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-01-27.acacia',
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: Request) {
    const body = await req.text();
    const headersList = await headers();
    const sig = headersList.get('stripe-signature');

    let event: Stripe.Event;

    try {
        if (!sig || !endpointSecret) {
            // If no secret is set, we might fallback to trusting the callback in dev (not recommended for prod)
            // but for now, let's log error.
            console.warn('Webhook received but no signature or secret found.');
            return NextResponse.json({ error: 'Webhook Error' }, { status: 400 });
        }

        event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
    } catch (err: any) {
        console.error(`Webhook Error: ${err.message}`);
        return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
    }

    // Handle the event
    switch (event.type) {
        case 'checkout.session.completed':
            const session = event.data.object as Stripe.Checkout.Session;
            const userId = session.client_reference_id;

            if (userId) {
                console.log(`Payment successful for user ${userId}`);

                try {
                    // Update User in Firestore
                    await adminDb.collection('users').doc(userId).set({
                        isPremium: true,
                        stripeCustomerId: session.customer,
                        updatedAt: new Date(),
                    }, { merge: true });
                } catch (err) {
                    console.error('Error updating Firestore:', err);
                }
            }
            break;
        default:
            console.log(`Unhandled event type ${event.type}`);
    }

    return NextResponse.json({ received: true });
}
