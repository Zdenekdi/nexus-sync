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
  MoreVertical,
  Minus,
  Check,
  X
} from 'lucide-react';

const InventoryView = ({ t }) => {
  const isMobile = window.innerWidth < 768;
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingLocation, setIsAddingLocation] = useState(false);
  const [newLocationName, setNewLocationName] = useState('');
  
  // Locations State
  const [locations, setLocations] = useState([
    { id: 'warehouse', labelKey: 'warehouse' },
    { id: 'officeMain', labelKey: 'officeMain' }
  ]);

  // Mock Data
  const [inventoryItems, setInventoryItems] = useState([
    { id: 1, name: 'SIM Card - UK EE', quantity: 150, threshold: 50, location: 'warehouse', lastUpdated: '2024-03-15' },
    { id: 2, name: 'SIM Card - DE O2', quantity: 12, threshold: 25, location: 'officeMain', lastUpdated: '2024-03-16' },
    { id: 3, name: 'Marketing Brochures', quantity: 500, threshold: 100, location: 'warehouse', lastUpdated: '2024-03-10' },
    { id: 4, name: 'Phone - Samsung A54', quantity: 3, threshold: 5, location: 'officeMain', lastUpdated: '2024-03-17' },
    { id: 5, name: 'SIM Card - FR Orange', quantity: 0, threshold: 20, location: 'officeMain', lastUpdated: '2024-03-17' },
  ]);

  const handleAddLocation = () => {
    if (newLocationName.trim()) {
      const newId = newLocationName.toLowerCase().replace(/\s+/g, '-');
      setLocations(prev => [...prev, { id: newId, label: newLocationName }]);
      setNewLocationName('');
      setIsAddingLocation(false);
    }
  };

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
    if (quantity === 0) return 'var(--error-color)';
    if (quantity <= threshold) return 'var(--warning-color)';
    return 'var(--success-color)';
  };

  const getStatusText = (quantity, threshold) => {
    if (quantity === 0) return t.outOfStock;
    if (quantity <= threshold) return t.lowStock;
    return t.inStock;
  };

  const getLocLabel = (loc) => {
    if (loc.labelKey) return t[loc.labelKey];
    return loc.label;
  };

  return (
    <div style={{ padding: isMobile ? 'calc(1rem + env(safe-area-inset-left)) 1rem calc(8rem + max(env(safe-area-inset-bottom), 1rem) + env(safe-area-inset-right))' : '3rem', paddingBottom: '8rem', flex: 1, overflowY: 'auto', maxHeight: isMobile ? 'calc(100dvh - max(env(safe-area-inset-top), 1rem) - 3rem)' : '100%' }} className="fade-in custom-scrollbar">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', marginBottom: isMobile ? '1.5rem' : '3rem', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '1rem' : 0 }}>
        <div>
          <h2 style={{ fontSize: isMobile ? '1.75rem' : '2.5rem', fontWeight: '900', marginBottom: '0.5rem', background: 'linear-gradient(to right, #60a5fa, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Package size={isMobile ? 24 : 32} color="var(--accent-color)" /> {t.stockCard}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: isMobile ? '0.9rem' : '1.1rem' }}>Manage physical assets across your agency nodes.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexDirection: isMobile ? 'column' : 'row', width: isMobile ? '100%' : 'auto' }}>
          <div style={{ display: isMobile ? 'none' : 'flex', gap: '1rem', alignItems: 'center' }}>
            {/* Keeping existing flow for desktop, will simplify for mobile below */}
            {isAddingLocation ? (
              <div className="glass-card" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', animation: 'fadeIn 0.2s ease' }}>
                <input
                  type="text"
                  autoFocus
                  placeholder={t.locationNamePlaceholder}
                  value={newLocationName}
                  onChange={(e) => setNewLocationName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddLocation()}
                  style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '0.85rem', outline: 'none', width: '150px' }}
                />
                <button onClick={handleAddLocation} style={{ background: 'var(--success-color)', border: 'none', borderRadius: '4px', color: 'white', padding: '2px', cursor: 'pointer' }}>
                  <Check size={14} />
                </button>
                <button onClick={() => setIsAddingLocation(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '4px', color: 'white', padding: '2px', cursor: 'pointer' }}>
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ position: 'relative' }}>
                  <MapPin size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <select
                    value={selectedLocation}
                    onChange={(e) => setSelectedLocation(e.target.value)}
                    style={{
                      padding: '0.6rem 2.5rem 0.6rem 2.5rem',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid var(--card-border)',
                      borderRadius: '10px',
                      color: 'white',
                      fontSize: '0.9rem',
                      appearance: 'none',
                      cursor: 'pointer',
                      minWidth: '180px'
                    }}
                  >
                    <option value="all">{t.allLocations}</option>
                    {locations.map(loc => (
                      <option key={loc.id} value={loc.id}>{getLocLabel(loc)}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} color="var(--text-secondary)" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                </div>
                <button 
                  onClick={() => setIsAddingLocation(true)}
                  title={t.addLocation}
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', padding: '0.6rem', borderRadius: '10px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Plus size={18} />
                </button>
              </div>
            )}
          </div>
          
          <button className="action-btn" style={{ marginTop: 0, width: isMobile ? '100%' : 'auto', padding: '0.6rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: 'var(--accent-color)', borderRadius: '10px', fontWeight: '700' }}>
            <Plus size={18} style={{ strokeWidth: 3 }} /> {t.addStockItem}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: isMobile ? '1rem' : '1.5rem', marginBottom: '3rem' }}>
        <div className="glass-card" style={{ padding: isMobile ? '1rem' : '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '0.5rem', borderRadius: '10px' }}>
              <Package size={20} color="var(--accent-color)" />
            </div>
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.6rem', fontWeight: '800', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>{t.itemsInStock.toUpperCase()}</div>
          <div style={{ fontSize: isMobile ? '1.25rem' : '1.5rem', fontWeight: '900' }}>{stats.inStock}</div>
        </div>

        <div className="glass-card" style={{ padding: isMobile ? '1rem' : '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '0.5rem', borderRadius: '10px' }}>
              <AlertTriangle size={20} color="var(--warning-color)" />
            </div>
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.6rem', fontWeight: '800', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>{t.lowStockItems.toUpperCase()}</div>
          <div style={{ fontSize: isMobile ? '1.25rem' : '1.5rem', fontWeight: '900' }}>{stats.lowStock}</div>
        </div>

        <div className="glass-card" style={{ padding: isMobile ? '1rem' : '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '0.5rem', borderRadius: '10px' }}>
              <XCircle size={20} color="var(--error-color)" />
            </div>
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.6rem', fontWeight: '800', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>{t.outOfStockItems.toUpperCase()}</div>
          <div style={{ fontSize: isMobile ? '1.25rem' : '1.5rem', fontWeight: '900' }}>{stats.outOfStock}</div>
        </div>

        <div className="glass-card" style={{ padding: isMobile ? '1rem' : '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '0.5rem', borderRadius: '10px' }}>
              <RefreshCw size={20} color="var(--success-color)" />
            </div>
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.6rem', fontWeight: '800', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>SYNC</div>
          <div style={{ fontSize: isMobile ? '1.25rem' : '1.5rem', fontWeight: '900' }}>LIVE</div>
        </div>
      </div>

      {/* Main Table Content */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: isMobile ? '1rem' : '1.5rem', borderBottom: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.01)', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '1rem' : 0 }}>
          <div style={{ position: 'relative', width: isMobile ? '100%' : '400px' }}>
            <Search size={18} color="var(--text-secondary)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              placeholder="Search items..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', padding: '0.85rem 0.85rem 0.85rem 2.5rem', borderRadius: '12px', color: 'white' }} 
            />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'space-between' : 'flex-end' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', padding: '0.6rem', borderRadius: '10px', color: 'white', cursor: 'pointer' }}>
                <Filter size={18} />
              </button>
              <button style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', padding: '0.6rem', borderRadius: '10px', color: 'white', cursor: 'pointer' }}>
                <RefreshCw size={18} />
              </button>
            </div>
            {isMobile && (
              <div style={{ position: 'relative' }}>
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  style={{
                    padding: '0.6rem 2rem 0.6rem 0.75rem',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--card-border)',
                    borderRadius: '10px',
                    color: 'white',
                    fontSize: '0.85rem',
                    appearance: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="all">{t.allLocations}</option>
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.id}>{getLocLabel(loc)}</option>
                  ))}
                </select>
                <ChevronDown size={14} color="var(--text-secondary)" style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              </div>
            )}
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--card-border)', background: 'rgba(255,255,255,0.02)' }}>
                <th style={{ padding: '1.25rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.itemName}</th>
                <th style={{ padding: '1.25rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.location}</th>
                <th style={{ padding: '1.25rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>{t.quantity}</th>
                <th style={{ padding: '1.25rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>{t.alertThreshold}</th>
                <th style={{ padding: '1.25rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.status}</th>
                <th style={{ padding: '1.25rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>{t.actions}</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map(item => (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--card-border)', transition: 'background 0.2s' }} className="table-row-hover">
                  <td style={{ padding: '1.25rem 1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ width: '40px', height: '40px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Package size={20} color="var(--text-secondary)" />
                      </div>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '1rem' }}>{item.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{t.lastUpdated}: {item.lastUpdated}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '1.25rem 1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                      <MapPin size={14} />
                      {(() => {
                        const loc = locations.find(l => l.id === item.location);
                        return loc ? getLocLabel(loc) : item.location;
                      })()}
                    </div>
                  </td>
                  <td style={{ padding: '1.25rem 1.5rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: '800', color: item.quantity <= item.threshold ? 'var(--warning-color)' : 'white' }}>
                      {item.quantity}
                    </div>
                  </td>
                  <td style={{ padding: '1.25rem 1.5rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{item.threshold}</div>
                  </td>
                  <td style={{ padding: '1.25rem 1.5rem' }}>
                    <div style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '0.5rem', 
                      padding: '0.4rem 0.8rem', 
                      borderRadius: '8px', 
                      fontSize: '0.75rem', 
                      fontWeight: '800',
                      background: `${getStatusColor(item.quantity, item.threshold)}15`,
                      color: getStatusColor(item.quantity, item.threshold),
                      border: `1px solid ${getStatusColor(item.quantity, item.threshold)}30`
                    }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: getStatusColor(item.quantity, item.threshold) }}></div>
                      {getStatusText(item.quantity, item.threshold).toUpperCase()}
                    </div>
                  </td>
                  <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                      <button style={{ padding: '0.4rem 0.8rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', borderRadius: '8px', color: 'white', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer' }}>
                        {t.updateStock}
                      </button>
                      <button style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                        <MoreVertical size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <Package size={48} style={{ opacity: 0.1, marginBottom: '1rem' }} />
                    <div>No inventory items found.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <style>{`
        .table-row-hover:hover {
          background: rgba(255,255,255,0.03) !important;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-5px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default InventoryView;
