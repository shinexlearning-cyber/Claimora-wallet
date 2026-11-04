import { Card } from '@/components/ui/Card';

export function History() {
  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto space-y-6">
      <h1 className="text-xl font-bold">Transaction History</h1>

      <Card>
        <p className="text-sm text-gray-500 text-center py-10">
          Transaction history requires an indexer (Etherscan API, Alchemy, etc.).
          <br />
          <span className="text-xs mt-2 block">
            Configure an API key in the environment to enable real history.
          </span>
        </p>
      </Card>
    </div>
  );
}
