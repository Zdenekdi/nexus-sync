import React from 'react';
import AgenciesView from '../Views/AgenciesView';
import GlobalFeaturesView from '../Views/GlobalFeaturesView';
import PermissionsDashboard from '../PermissionsDashboard';
import PlansDashboard from '../PlansDashboard';
import InfraTab from '../InfraTab';

const InfrastructureUnit = ({
  activeTab,
  isMobile,
  t,
  lang,
  // Common Props
  activeOperator,
  token,
  API_BASE,
  // Agencies Props
  agencies,
  profiles,
  operators,
  setIsAddAgencyModalOpen,
  setSelectedAgencyDetail,
  setOriginalOperator,
  setActiveClient,
  setActiveOperator,
  setActiveTab,
  deleteAgency,
  // Permissions Props
  fetchUserPermissions,
  // Plans Props
  subscriptionPlans,
  setSubscriptionPlans,
  activeMarket,
  setActiveMarket,
  currentAgency,
  // Features Props
  globalFeatures,
  setGlobalFeatures,
  isTraining,
  setIsTraining,
  trainingProgress,
  setTrainingProgress,
  axios
}) => {
  switch (activeTab) {
    case 'agencies':
      return (
        <AgenciesView 
          agencies={agencies}
          profiles={profiles}
          operators={operators}
          t={t}
          isMobile={isMobile}
          onAddAgency={() => setIsAddAgencyModalOpen(true)}
          onDetail={setSelectedAgencyDetail}
          onImpersonate={(agency) => {
            setOriginalOperator(activeOperator);
            setActiveClient(agency);
            const agencyOps = operators.filter(o => o.agencyId === agency.id);
            const best = agencyOps.find(o => o.role?.isManager || o.role?.name?.includes('Manager') || o.role?.name?.includes('Admin')) || agencyOps[0];
            if (best) setActiveOperator(best);
            setActiveTab('dashboard');
          }}
          onDelete={deleteAgency}
        />
      );
    case 'infra':
      return <InfraTab t={t} />;
    case 'permissions':
      return (
        <PermissionsDashboard
          t={t}
          activeOperator={activeOperator}
          onUpdate={fetchUserPermissions}
        />
      );
    case 'plans':
      return (
        <PlansDashboard 
          lang={lang} t={t} 
          subscriptionPlans={subscriptionPlans} 
          setSubscriptionPlans={setSubscriptionPlans} 
          activeMarket={activeMarket} 
          setActiveMarket={setActiveMarket} 
          activeOperator={activeOperator} 
          currentAgency={currentAgency} 
        />
      );
    case 'features':
      return (
        <GlobalFeaturesView 
          t={t} lang={lang} isMobile={isMobile}
          globalFeatures={globalFeatures}
          isTraining={isTraining}
          trainingProgress={trainingProgress}
          onFeatureToggle={async (feature, i) => {
            const newState = !feature.active;
            const featCopy = [...globalFeatures];
            featCopy[i].active = newState;
            setGlobalFeatures(featCopy);
            try {
              await axios.patch(`${API_BASE}/admin/features/${feature.id}`, { active: newState }, { headers: { Authorization: `Bearer ${token}` } });
            } catch (err) {
              const revert = [...globalFeatures];
              revert[i].active = !newState;
              setGlobalFeatures(revert);
            }
          }}
          onStartTraining={() => {
            setIsTraining(true);
            const interval = setInterval(() => {
              setTrainingProgress(p => {
                if (p >= 100) { clearInterval(interval); setIsTraining(false); return 100; }
                return p + 5;
              });
            }, 200);
          }}
          onResetTraining={() => setTrainingProgress(0)}
        />
      );
    default:
      return null;
  }
};

export default InfrastructureUnit;
