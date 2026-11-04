import { Card } from '@/components/ui/Card';

export function Buy() {
  return (
    <div className="p-4 lg:p-8 max-w-lg mx-auto space-y-6">
      <h1 className="text-xl font-bold">Buy Crypto</h1>
      <Card>
        <p className="text-sm text-gray-500 text-center py-10">
          Buy requires a fiat on-ramp provider (MoonPay, Ramp, Transak, etc.).
          <br />
          <span className="text-xs mt-2 block text-gray-600">
            No fake payment UI is shown. Integrate a provider when ready.
          </span>
        </p>
      </Card>
    </div>
  );
}
