
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// Initialize Stripe safely to prevent build/deploy crashes if env var is missing during static analysis
const stripe = process.env.STRIPE_SECRET_KEY
    ? new Stripe(process.env.STRIPE_SECRET_KEY, {
        // apiVersion: '2025-01-27.acacia', // Removed to fix type error
    })
    : null;

export async function POST(req: Request) {
    try {
        const { userId, email, returnUrl } = await req.json();

        if (!userId || !email) {
            return NextResponse.json({ error: 'Missing userId or email' }, { status: 400 });
        }

        if (!stripe) {
            console.error('Stripe not initialized');
            return NextResponse.json({ error: 'Internal Server Error: Payment System Unavailable' }, { status: 500 });
        }

        // Create Checkout Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: 'fRepo Premium Account',
                            description: 'Lifetime access to fRepo tracking.',
                        },
                        unit_amount: 99, // $0.99
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${returnUrl}?payment=success`,
            cancel_url: `${returnUrl}?payment=cancelled`,
            customer_email: email,
            client_reference_id: userId, // Pass userId to webhook
            metadata: {
                userId: userId,
            },
        });

        return NextResponse.json({ url: session.url });
    } catch (err: any) {
        console.error('Stripe Checkout Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
