import React, { useState, useMemo } from 'react';
import { 
  Package, 
  MapPin, 
  AlertTriangle, 
  Plus, 
  Search, 
  Filter, 
  ChevronDown, 
  CheckCircle2, 
  XCircle,
  RefreshCw,
  MoreVertical
} from 'lucide-react';

const InventoryView = ({ t }) => {
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Mock Data
  const [inventoryItems, setInventoryItems] = useState([
    { id: 1, name: 'SIM Card - UK EE', quantity: 150, threshold: 50, location: 'warehouse', lastUpdated: '2024-03-15' },
    { id: 2, name: 'SIM Card - DE O2', quantity: 12, threshold: 25, location: 'officeMain', lastUpdated: '2024-03-16' },
    { id: 3, name: 'Marketing Brochures', quantity: 500, threshold: 100, location: 'warehouse', lastUpdated: '2024-03-10' },
    { id: 4, name: 'Phone - Samsung A54', quantity: 3, threshold: 5, location: 'officeMain', lastUpdated: '2024-03-17' },
    { id: 5, name: 'SIM Card - FR Orange', quantity: 0, threshold: 20, location: 'officeMain', lastUpdated: '2024-03-17' },
  ]);

  const filteredItems = useMemo(() => {
    return inventoryItems.filter(item => {
      const matchesLocation = selectedLocation === 'all' || item.location === selectedLocation;
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesLocation && matchesSearch;
    });
  }, [inventoryItems, selectedLocation, searchQuery]);

  const stats = useMemo(() => {
    const activeItems = inventoryItems.filter(item => selectedLocation === 'all' || item.location === selectedLocation);
    return {
      total: activeItems.length,
      lowStock: activeItems.filter(item => item.quantity > 0 && item.quantity <= item.threshold).length,
      outOfStock: activeItems.filter(item => item.quantity === 0).length,
      inStock: activeItems.filter(item => item.quantity > item.threshold).length
    };
  }, [inventoryItems, selectedLocation]);

  const getStatusColor = (quantity, threshold) => {
    if (quantity === 0) return 'text-red-500 bg-red-500/10';
    if (quantity <= threshold) return 'text-amber-500 bg-amber-500/10';
    return 'text-emerald-500 bg-emerald-500/10';
  };

  const getStatusText = (quantity, threshold) => {
    if (quantity === 0) return t.outOfStock;
    if (quantity <= threshold) return t.lowStock;
    return t.inStock;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Package className="w-8 h-8 text-blue-500" />
            {t.stockCard}
          </h1>
          <p className="text-zinc-400 text-sm mt-1">Manage physical assets across your agency nodes.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none min-w-[180px]"
            >
              <option value="all">{t.allLocations}</option>
              <option value="warehouse">{t.warehouse}</option>
              <option value="officeMain">{t.officeMain}</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium transition-colors shadow-lg shadow-blue-500/20">
            <Plus className="w-4 h-4" />
            {t.addStockItem}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 p-4 rounded-2xl">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Package className="w-5 h-5 text-blue-500" />
            </div>
            <span className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">{t.itemsInStock}</span>
          </div>
          <div className="text-2xl font-bold text-white">{stats.inStock}</div>
        </div>
        
        <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 p-4 rounded-2xl">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            </div>
            <span className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">{t.lowStockItems}</span>
          </div>
          <div className="text-2xl font-bold text-white">{stats.lowStock}</div>
        </div>

        <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 p-4 rounded-2xl">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <XCircle className="w-5 h-5 text-red-500" />
            </div>
            <span className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">{t.outOfStockItems}</span>
          </div>
          <div className="text-2xl font-bold text-white">{stats.outOfStock}</div>
        </div>

        <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 p-4 rounded-2xl">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <RefreshCw className="w-5 h-5 text-emerald-500" />
            </div>
            <span className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">SYNC STATUS</span>
          </div>
          <div className="text-sm font-semibold text-emerald-500">REAL-TIME</div>
        </div>
      </div>

      {/* Controls & Table */}
      <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-3xl overflow-hidden">
        <div className="p-4 border-b border-zinc-800 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors">
              <Filter className="w-5 h-5" />
            </button>
            <button className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors">
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-zinc-800/30">
                <th className="px-6 py-4 text-zinc-400 text-xs font-semibold uppercase tracking-wider">{t.itemName}</th>
                <th className="px-6 py-4 text-zinc-400 text-xs font-semibold uppercase tracking-wider">{t.location}</th>
                <th className="px-6 py-4 text-zinc-400 text-xs font-semibold uppercase tracking-wider text-center">{t.quantity}</th>
                <th className="px-6 py-4 text-zinc-400 text-xs font-semibold uppercase tracking-wider text-center">{t.alertThreshold}</th>
                <th className="px-6 py-4 text-zinc-400 text-xs font-semibold uppercase tracking-wider">{t.status}</th>
                <th className="px-6 py-4 text-zinc-400 text-xs font-semibold uppercase tracking-wider text-right">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {filteredItems.map(item => (
                <tr key={item.id} className="hover:bg-zinc-800/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center">
                        <Package className="w-5 h-5 text-zinc-500" />
                      </div>
                      <div>
                        <div className="text-white font-medium">{item.name}</div>
                        <div className="text-zinc-500 text-xs">{t.lastUpdated}: {item.lastUpdated}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-zinc-300">
                      <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                      <span className="text-sm">{t[item.location]}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`text-sm font-bold ${item.quantity <= item.threshold ? 'text-amber-500' : 'text-white'}`}>
                      {item.quantity}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-sm text-zinc-500">{item.threshold}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${getStatusColor(item.quantity, item.threshold)}`}>
                      {getStatusText(item.quantity, item.threshold)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-medium rounded-lg transition-colors border border-zinc-700">
                        {t.updateStock}
                      </button>
                      <button className="p-1.5 text-zinc-500 hover:text-white transition-colors">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-zinc-500">
                    <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>No stock items found for this criteria.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default InventoryView;
