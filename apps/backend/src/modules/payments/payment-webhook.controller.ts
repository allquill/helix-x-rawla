import {
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Req,
  Res,
  type RawBodyRequest,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { CheckoutGatewayService } from './checkout-gateway.service';
import { PaymentSettlementRegistry } from './payment-settlement.registry';

/**
 * The payment provider's side of settlement, for dues and event registrations.
 *
 * Public by omission, like `PublicRegistrationController`: no `@UseGuards`, so
 * no principal, so the gate interceptor never engages. Stripe authenticates
 * itself with the webhook signature instead, which is why `main.ts` keeps the
 * raw body.
 *
 * Excluded from the OpenAPI document — nothing in the frontend calls these, and
 * a webhook in the generated client would only invite someone to.
 */
@ApiExcludeController()
@Controller()
export class PaymentWebhookController {
  constructor(
    private readonly gateway: CheckoutGatewayService,
    private readonly settlements: PaymentSettlementRegistry,
  ) {}

  @Post('payments/stripe/webhook')
  @HttpCode(HttpStatus.OK)
  async handleStripeWebhook(
    @Req() request: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string | undefined,
  ): Promise<{ received: true }> {
    const paid = this.gateway.verifyStripeEvent(request.rawBody, signature);
    if (paid) await this.settlements.settle(paid.sessionId, paid.kind);
    return { received: true };
  }

  /**
   * `PAYMENT_PROVIDER=console` stands in for the hosted checkout page: visiting
   * the URL is "paying". 404 under any other provider and in production, so it
   * cannot settle a real payment.
   */
  @Get('dev/payments/:ref/complete')
  async completeConsoleCheckout(@Param('ref') ref: string, @Res() res: Response): Promise<void> {
    if (!this.gateway.consoleEnabled || !ref.startsWith('console_')) {
      throw new NotFoundException();
    }
    const handler = this.settlements.get(this.settlements.kindOfConsoleRef(ref));
    if (!handler) throw new NotFoundException();
    await handler.settle(ref);
    res.redirect(await handler.returnUrl(ref, 'success'));
  }
}
