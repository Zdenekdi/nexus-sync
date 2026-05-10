import React, { useState, useEffect, useCallback } from 'react';
import { 
  Package, MapPin, AlertCircle, Plus, Search, 
  Trash2, Edit3, ChevronRight, LayoutGrid, List,
  BarChart3, RefreshCw, Layers
} from 'lucide-react';
import { useNexus } from '../../context/ContextHook';
import axios from 'axios';

const InventoryView = () => {
  const { t, token, isMobile, API_BASE, showToast } = useNexus();
  const [locations, setLocations] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('stock'); // 'stock' or 'locations'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('all');
  
  // Modals
  const [showAddLoc, setShowAddLoc] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [newLocName, setNewLocName] = useState('');
  const [newItem, setNewItem] = useState({ name: '', quantity: 0, threshold: 10, locationId: '' });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [locsRes, itemsRes] = await Promise.all([
        axios.get(`${API_BASE}/inventory/locations`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_BASE}/inventory/items`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setLocations(locsRes.data);
      setItems(itemsRes.data);
    } catch (_err) {
      console.error('Failed to fetch inventory:', _err);
      showToast('Nepodařilo se načíst data skladu', 'error');
    } finally {
      setLoading(false);
    }
  }, [token, API_BASE, showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddLocation = async () => {
    if (!newLocName.trim()) return;
    try {
      const res = await axios.post(`${API_BASE}/inventory/locations`, { name: newLocName }, { headers: { Authorization: `Bearer ${token}` } });
      setLocations([...locations, res.data]);
      setNewLocName('');
      setShowAddLoc(false);
      showToast('Lokace byla vytvořena', 'success');
    } catch (_err) {
      showToast('Chyba při vytváření lokace', 'error');
    }
  };

  const handleAddItem = async () => {
    if (!newItem.name.trim() || !newItem.locationId) {
      showToast('Vyplňte jméno a lokaci', 'warning');
      return;
    }
    try {
      const res = await axios.post(`${API_BASE}/inventory/items`, newItem, { headers: { Authorization: `Bearer ${token}` } });
      setItems([...items, res.data]);
      setShowAddItem(false);
      setNewItem({ name: '', quantity: 0, threshold: 10, locationId: '' });
      showToast('Položka byla přidána', 'success');
    } catch (_err) {
      showToast('Chyba při přidávání položky', 'error');
    }
  };

  const handleDeleteItem = async (id) => {
    if (!window.confirm('Opravdu smazat tuto položku?')) return;
    try {
      await axios.delete(`${API_BASE}/inventory/items/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setItems(items.filter(i => i.id !== id));
      showToast('Položka smazána', 'info');
    } catch (_err) {
      showToast('Chyba při mazání', 'error');
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLoc = selectedLocation === 'all' || item.locationId === selectedLocation;
    return matchesSearch && matchesLoc;
  });

  const getStockStatus = (item) => {
    if (item.quantity <= 0) return { label: 'VYPRODÁNO', color: '#ef4444' };
    if (item.quantity <= item.threshold) return { label: 'NÍZKÝ STAV', color: '#f59e0b' };
    return { label: 'SKLADEM', color: '#10b981' };
  };

  return (
    <div style={{ padding: isMobile ? '1.5rem 1rem' : '3rem', paddingBottom: '8rem', flex: 1, overflowY: 'auto' }} className="fade-in custom-scrollbar">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', marginBottom: '3rem', flexDirection: isMobile ? 'column' : 'row', gap: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: isMobile ? '1.75rem' : '2.5rem', fontWeight: '900', marginBottom: '0.5rem', background: 'linear-gradient(to right, #10b981, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Package size={isMobile ? 24 : 32} color="#10b981" /> {t('inventorySystem') || 'Skladový systém'}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>Správa zásob a logistických lokací agentury.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button onClick={() => activeTab === 'stock' ? setShowAddItem(true) : setShowAddLoc(true)} className="action-btn" style={{ margin: 0, padding: '0.8rem 1.5rem', borderRadius: '14px' }}>
            <Plus size={18} /> {activeTab === 'stock' ? 'PŘIDAT POLOŽKU' : 'NOVÁ LOKACE'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--card-border)', paddingBottom: '1rem' }}>
        <button 
          onClick={() => setActiveTab('stock')}
          style={{ background: 'none', border: 'none', color: activeTab === 'stock' ? 'white' : 'var(--text-secondary)', fontWeight: '800', fontSize: '0.9rem', cursor: 'pointer', padding: '0.5rem 1rem', position: 'relative' }}
        >
          PŘEHLED ZÁSOB
          {activeTab === 'stock' && <div style={{ position: 'absolute', bottom: '-1rem', left: 0, right: 0, height: '3px', background: '#10b981', borderRadius: '3px' }} />}
        </button>
        <button 
          onClick={() => setActiveTab('locations')}
          style={{ background: 'none', border: 'none', color: activeTab === 'locations' ? 'white' : 'var(--text-secondary)', fontWeight: '800', fontSize: '0.9rem', cursor: 'pointer', padding: '0.5rem 1rem', position: 'relative' }}
        >
          LOKACE A SKLADY
          {activeTab === 'locations' && <div style={{ position: 'absolute', bottom: '-1rem', left: 0, right: 0, height: '3px', background: '#3b82f6', borderRadius: '3px' }} />}
        </button>
      </div>

      {activeTab === 'stock' ? (
        <>
          {/* Stock Toolbar */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '250px' }}>
              <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.3 }} />
              <input 
                type="text" 
                placeholder="Hledat položku..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '0.85rem 1rem 0.85rem 3rem', borderRadius: '14px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', color: 'white' }}
              />
            </div>
            <select 
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              style={{ padding: '0.85rem 1rem', borderRadius: '14px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', color: 'white', minWidth: '180px' }}
            >
              <option value="all">Všechny lokace</option>
              {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>

          {/* Items Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {loading && items.length === 0 ? (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem' }}><RefreshCw className="animate-spin" /></div>
            ) : filteredItems.length === 0 ? (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem', opacity: 0.5 }}>Žádné položky nenalezeny.</div>
            ) : filteredItems.map(item => {
              const status = getStockStatus(item);
              return (
                <div key={item.id} className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '12px' }}>
                      <Package size={20} color={status.color} />
                    </div>
                    <div style={{ fontSize: '0.65rem', fontWeight: '900', color: status.color, background: `${status.color}15`, padding: '4px 8px', borderRadius: '6px', border: `1px solid ${status.color}30` }}>
                      {status.label}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontWeight: '800', fontSize: '1.1rem', marginBottom: '0.25rem' }}>{item.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <MapPin size={12} /> {item.location?.name || 'Neznámá lokace'}
                    </div>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: '700' }}>STAV</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: '900' }}>{item.quantity} <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>ks</span></div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: '700' }}>MINIMUM</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: '700', opacity: 0.8 }}>{item.threshold} ks</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <button style={{ flex: 1, padding: '0.6rem', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', color: 'white', cursor: 'pointer' }}><Edit3 size={14} /></button>
                    <button onClick={() => handleDeleteItem(item.id)} style={{ padding: '0.6rem', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={14} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        /* Locations View */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
          {locations.map(loc => (
            <div key={loc.id} className="glass-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <div style={{ width: '50px', height: '50px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MapPin size={24} color="#3b82f6" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '800', fontSize: '1.1rem' }}>{loc.name}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{loc._count?.items || 0} různých položek</div>
              </div>
              <ChevronRight size={20} color="var(--text-secondary)" />
            </div>
          ))}
        </div>
      )}

      {/* Add Item Modal */}
      {showAddItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-card fade-in" style={{ width: '100%', maxWidth: '450px', padding: '2rem' }}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: '900', marginBottom: '1.5rem' }}>Přidat položku</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>NÁZEV POLOŽKY</label>
                <input 
                  type="text" 
                  value={newItem.name} 
                  onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                  placeholder="např. Condoms Box, Champagne..."
                  style={{ width: '100%', padding: '0.8rem', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', color: 'white' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>MNOŽSTVÍ</label>
                  <input 
                    type="number" 
                    value={newItem.quantity} 
                    onChange={(e) => setNewItem({...newItem, quantity: e.target.value})}
                    style={{ width: '100%', padding: '0.8rem', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', color: 'white' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>VAROVÁNÍ PŘI</label>
                  <input 
                    type="number" 
                    value={newItem.threshold} 
                    onChange={(e) => setNewItem({...newItem, threshold: e.target.value})}
                    style={{ width: '100%', padding: '0.8rem', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', color: 'white' }}
                  />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>LOKACE / SKLAD</label>
                <select 
                  value={newItem.locationId} 
                  onChange={(e) => setNewItem({...newItem, locationId: e.target.value})}
                  style={{ width: '100%', padding: '0.8rem', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', color: 'white' }}
                >
                  <option value="">Vyberte lokaci...</option>
                  {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button onClick={() => setShowAddItem(false)} style={{ flex: 1, padding: '0.8rem', borderRadius: '12px', border: '1px solid var(--card-border)', background: 'transparent', color: 'white', fontWeight: '800', cursor: 'pointer' }}>ZRUŠIT</button>
                <button onClick={handleAddItem} style={{ flex: 1, padding: '0.8rem', borderRadius: '12px', border: 'none', background: 'var(--accent-color)', color: 'white', fontWeight: '800', cursor: 'pointer' }}>ULOŽIT</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Location Modal */}
      {showAddLoc && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-card fade-in" style={{ width: '100%', maxWidth: '400px', padding: '2rem' }}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: '900', marginBottom: '1.5rem' }}>Nová lokace</h3>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>NÁZEV LOKACE</label>
              <input 
                type="text" 
                value={newLocName} 
                onChange={(e) => setNewLocName(e.target.value)}
                placeholder="např. Hlavní sklad, Incall Studio..."
                style={{ width: '100%', padding: '0.8rem', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', color: 'white', marginBottom: '2rem' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={() => setShowAddLoc(false)} style={{ flex: 1, padding: '0.8rem', borderRadius: '12px', border: '1px solid var(--card-border)', background: 'transparent', color: 'white', fontWeight: '800', cursor: 'pointer' }}>ZRUŠIT</button>
              <button onClick={handleAddLocation} style={{ flex: 1, padding: '0.8rem', borderRadius: '12px', border: 'none', background: '#3b82f6', color: 'white', fontWeight: '800', cursor: 'pointer' }}>VYTVOŘIT</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .animate-spin { animation: spin 2s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default InventoryView;
