import { Card } from '@/components/ui/Card';

export function Swap() {
  return (
    <div className="p-4 lg:p-8 max-w-lg mx-auto space-y-6">
      <h1 className="text-xl font-bold">Swap</h1>
      <Card>
        <p className="text-sm text-gray-500 text-center py-10">
          Swap requires integration with a DEX aggregator (e.g. 0x, 1inch, Uniswap SDK).
          <br />
          <span className="text-xs mt-2 block text-gray-600">
            Structure is ready – add a provider API key and implement the quote + swap flow.
          </span>
        </p>
      </Card>
    </div>
  );
}
