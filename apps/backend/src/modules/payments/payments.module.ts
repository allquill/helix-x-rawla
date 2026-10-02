import { Global, Module } from '@nestjs/common';
import { CheckoutGatewayService } from './checkout-gateway.service';
import { PaymentSettlementRegistry } from './payment-settlement.registry';
import { PaymentWebhookController } from './payment-webhook.controller';

/**
 * The shared payment rail: one checkout gateway and one webhook for everything
 * the portal charges for.
 *
 * `@Global()` so the dues service in `CommunityCoreModule` and the events
 * module both inject it without either importing the other.
 */
@Global()
@Module({
  controllers: [PaymentWebhookController],
  providers: [CheckoutGatewayService, PaymentSettlementRegistry],
  exports: [CheckoutGatewayService, PaymentSettlementRegistry],
})
export class PaymentsModule {}
