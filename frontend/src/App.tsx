function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-green-700 text-white px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">🇰🇪</span>
          <h1 className="text-lg font-bold">Kenya Farm IoT</h1>
          <span className="ml-2 rounded bg-white/20 px-2 py-0.5 text-sm">MVP</span>
        </div>
      </nav>
      <main className="container mx-auto max-w-4xl px-4 py-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Dashboard</h2>
        <p className="text-gray-600 mb-6">
          Smart farming for Kenyan farmers. Soil moisture alerts via SMS.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <h3 className="font-semibold text-gray-800">Soil Moisture</h3>
            <p className="text-3xl font-bold text-green-600">—</p>
            <p className="text-sm text-gray-500">Connect a sensor or register to see data</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <h3 className="font-semibold text-gray-800">Farmers</h3>
            <p className="text-3xl font-bold text-gray-800">0</p>
            <p className="text-sm text-gray-500">Registered</p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
