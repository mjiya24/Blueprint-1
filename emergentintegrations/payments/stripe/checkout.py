from pydantic import BaseModel
from typing import List, Optional

class CheckoutSessionRequest(BaseModel):
    price_id: str
    success_url: str
    cancel_url: str
    mode: str = "subscription"
    customer_email: Optional[str] = None

class StripeCheckout:
    def __init__(self, api_key: str):
        import stripe
        self.stripe = stripe
        self.stripe.api_key = api_key

    async def create_checkout_session(self, data: CheckoutSessionRequest):
        session = self.stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price': data.price_id,
                'quantity': 1,
            }],
            mode=data.mode,
            success_url=data.success_url,
            cancel_url=data.cancel_url,
            customer_email=data.customer_email,
        )
        return session
