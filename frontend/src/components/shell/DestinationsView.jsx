import { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Plus,
  Trash2,
} from 'lucide-react';
import { IntegrationConnectionPage } from '@/components/shell/IntegrationConnectionPage';
import { ViewFrame } from '@/components/shell/ViewFrame';
import { useAppStore } from '@/stores/useAppStore';
import connectorsData from '@/data/connectors.json';
import '@/styles/integrations.css';

const EMPTY_CATALOG = {
  connectedDestinations: [],
  destinationCategories: [],
  featuredDestinations: [],
};

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function mapApiIntegrationToUI(apiItem) {
  return {
    id: apiItem.id || apiItem._id,
    name: apiItem.name || apiItem.connectorName || 'Unknown',
    type: apiItem.type || apiItem.categoryTitle || 'Destination',
    status: apiItem.status || 'connected',
    lastSync: apiItem.lastSync || apiItem.updatedAt || 'just now',
    note: apiItem.note || apiItem.description || '',
    authMethod: apiItem.authMethod || '',
    scope: apiItem.scope || '',
    connectorName: apiItem.connectorName || apiItem.name || '',
  };
}

function buildConnectorOptions(categories, flow) {
  return categories.flatMap((category) =>
    category.connectors.map((name) => ({
      id: `${flow}:${slugify(name)}`,
      flow,
      name,
      categoryId: category.id,
      categoryTitle: category.title,
      description: category.description,
      icon: category.icon,
    }))
  );
}

export function DestinationsView() {
  const {
    currentOrganization,
    currentWorkspace,
    integrationsData,
    fetchIntegrationCatalog,
    catalog,
    deployConnector,
    deleteConnector,
    isLoading,
    devMode,
    demoMode,
  } = useAppStore();

  const isMockMode = devMode || demoMode;

  const [connectedDestinations, setConnectedDestinations] = useState([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailItem, setDetailItem] = useState(null);

  // Fetch catalog on mount
  useEffect(() => {
    if (!isMockMode && currentOrganization?.id && currentWorkspace?.id) {
      fetchIntegrationCatalog(currentOrganization.id, currentWorkspace.id);
    }
  }, [currentOrganization?.id, currentWorkspace?.id, isMockMode, fetchIntegrationCatalog]);

  // Sync local state from store
  useEffect(() => {
    if (isMockMode) return;
    if (integrationsData && integrationsData.length > 0) {
      const destinations = integrationsData
        .filter((i) => i.flow === 'destination')
        .map(mapApiIntegrationToUI);
      if (destinations.length > 0) setConnectedDestinations(destinations);
    }
  }, [integrationsData, isMockMode]);

  const effectiveCatalog = isMockMode ? connectorsData : catalog;
  const effectiveConnectedDestinations = isMockMode
    ? connectorsData.connectedDestinations || []
    : connectedDestinations;

  const destinationCategoriesData = effectiveCatalog?.destinationCategories || EMPTY_CATALOG.destinationCategories;
  const featuredDestinations = effectiveCatalog?.featuredDestinations || [];
  const hasFeaturedDestinations = featuredDestinations.length > 0;

  const destinationOptions = useMemo(
    () => buildConnectorOptions(destinationCategoriesData, 'destination'),
    [destinationCategoriesData]
  );

  const getConnection = (connectorName) => {
    const match = effectiveConnectedDestinations.find(
      (d) => d.connectorName === connectorName || d.name === connectorName
    );
    return match
      ? { isConnected: true, flow: 'destination', id: match.id }
      : { isConnected: false, flow: 'destination', id: null };
  };

  const openSheet = (connectorName) => {
    setDetailItem({ connectorName, flow: 'destination' });
    setDetailOpen(true);
  };

  const handleRemoveConnection = (flow, id) => {
    if (!currentOrganization || !currentWorkspace || !id) return;
    deleteConnector(currentOrganization.id, currentWorkspace.id, id);
    setConnectedDestinations((prev) => prev.filter((d) => d.id !== id));
  };

  if (detailOpen && detailItem) {
    return (
      <IntegrationConnectionPage
        connectorName={detailItem.connectorName}
        flow="destination"
        onBack={() => setDetailOpen(false)}
      />
    );
  }

  return (
    <ViewFrame
      title="Destinations"
      description="Manage data destinations — where your processed data is sent."
      maxWidthClassName="max-w-6xl"
    >
      <div className="integrations-wrapper">
        <div className="integrations-section-head">
          <h3 className="available-integrations-title">Available Destinations</h3>
        </div>

        {hasFeaturedDestinations ? (
          <div className="integrations-grid">
            {featuredDestinations.map((integration) => {
              const { isConnected, flow, id } = getConnection(integration.connectorName);
              const openDetail = () => openSheet(integration.name);

              return (
                <div
                  key={integration.name}
                  className="integration-item"
                  role="button"
                  tabIndex={0}
                  onClick={openDetail}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      openDetail();
                    }
                  }}
                >
                  <div className="integration-icon-container is-empty" />

                  <div className="integration-info">
                    <span className="integration-name">{integration.name}</span>
                    <span className="integration-description">{integration.description}</span>
                  </div>

                  <div className="integration-action-cell">
                    {isConnected ? (
                      <button
                        className="integration-connected-btn"
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleRemoveConnection(flow, id);
                        }}
                        title="Disconnect"
                      >
                        <Check size={16} className="check-icon" />
                        <Trash2 size={14} className="trash-icon" />
                      </button>
                    ) : (
                      <button
                        className="integration-plus-btn"
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          openDetail();
                        }}
                        title="Open"
                      >
                        <Plus size={16} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="integration-empty-copy">
            No featured destinations are configured yet.
          </p>
        )}
      </div>
    </ViewFrame>
  );
}
