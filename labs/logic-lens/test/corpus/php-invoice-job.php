<?php

namespace App\Jobs;

class SendMonthlyInvoices implements ShouldQueue
{
    public int $tries = 3;

    public function __construct(private string $month) {}

    public function handle(InvoiceService $invoices, Mailer $mailer): void
    {
        Customer::query()
            ->where('billing', 'monthly')
            ->whereNull('suspended_at')
            ->chunkById(200, function ($customers) use ($invoices, $mailer) {
                foreach ($customers as $customer) {
                    if ($invoices->alreadySent($customer, $this->month)) {
                        continue;
                    }
                    try {
                        $pdf = $invoices->render($customer, $this->month);
                        $mailer->to($customer->email)->send(new InvoiceMail($pdf));
                        $invoices->markSent($customer, $this->month);
                    } catch (TransportException $e) {
                        Log::warning("invoice mail failed", ['customer' => $customer->id]);
                        $this->release(600);
                        return false;
                    }
                }
            });
    }

    public function failed(\Throwable $e): void
    {
        Notification::route('slack', config('ops.slack'))->notify(new JobFailed(self::class, $e));
    }
}
