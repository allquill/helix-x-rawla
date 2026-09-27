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
import { DuesPaymentService } from '../providers/dues-payment.service';

/**
 * The payment provider's side of dues settlement.
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
  constructor(private readonly duesPayment: DuesPaymentService) {}

  @Post('payments/stripe/webhook')
  @HttpCode(HttpStatus.OK)
  async handleStripeWebhook(
    @Req() request: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string | undefined,
  ): Promise<{ received: true }> {
    await this.duesPayment.handleStripeEvent(request.rawBody, signature);
    return { received: true };
  }

  /**
   * `PAYMENT_PROVIDER=console` stands in for the hosted checkout page: visiting
   * the URL is "paying". 404 under any other provider and in production, so it
   * cannot settle real dues.
   */
  @Get('dev/payments/:ref/complete')
  async completeConsoleCheckout(@Param('ref') ref: string, @Res() res: Response): Promise<void> {
    if (!this.duesPayment.consoleEnabled || !ref.startsWith('console_')) {
      throw new NotFoundException();
    }
    await this.duesPayment.settle(ref);
    res.redirect(this.duesPayment.statusUrl('success'));
  }
}
