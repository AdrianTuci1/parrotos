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
import { getConnectorImage } from '@/components/shell/IntegrationLogos';
import '@/styles/integrations.css';

const EMPTY_CATALOG = {
  connectedSources: [],
  connectedDestinations: [],
  sourceCategories: [],
  destinationCategories: [],
  featuredIntegrations: [],
  featuredDestinations: [],
};

const authOptions = ['OAuth', 'API Key', 'Service Account', 'Database Credentials', 'Webhook Token'];

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

function buildConnectionRecord(formState, connector) {
  const note = formState.notes.trim();

  return {
    id: `${connector.flow}-${slugify(connector.name)}-${Date.now()}`,
    name: connector.name,
    type: connector.categoryTitle,
    status: 'connected',
    lastSync: 'just now',
    note: note || `${connector.name} connected via ${formState.authMethod}.`,
    authMethod: formState.authMethod,
    scope: '',
    connectorName: connector.name,
  };
}

export function DestinationsView() {
  const {
    currentOrganization,
    currentWorkspace,
    devMode,
    demoMode,
    integrationsData,
    fetchIntegrations,
    fetchIntegrationCatalog,
    createIntegration,
    deleteIntegration,
  } = useAppStore();
  const isMockMode = devMode || demoMode;
  const destinationsEnabled = isMockMode;

  const [catalog, setCatalog] = useState(() => (isMockMode ? connectorsData : EMPTY_CATALOG));
  const [connectedSources, setConnectedSources] = useState(
    () => (isMockMode ? connectorsData.connectedSources : [])
  );
  const [connectedDestinations, setConnectedDestinations] = useState(
    () => (isMockMode ? connectorsData.connectedDestinations : [])
  );
  const [detailOpen, setDetailOpen] = useState(false);
  const [flowType, setFlowType] = useState('destination');

  // Fetch integrations from API on mount, fall back to defaults
  useEffect(() => {
    if (!isMockMode && currentOrganization?.id && currentWorkspace?.id) {
      fetchIntegrations(currentOrganization.id, currentWorkspace.id);
    }
  }, [currentOrganization?.id, currentWorkspace?.id, isMockMode, fetchIntegrations]);

  useEffect(() => {
    if (isMockMode) {
      Promise.resolve().then(() => {
        setCatalog(connectorsData);
        setConnectedSources(connectorsData.connectedSources);
        setConnectedDestinations(connectorsData.connectedDestinations);
      });
      return;
    }

    let cancelled = false;

    async function loadCatalog() {
      if (!currentOrganization?.id || !currentWorkspace?.id) {
        return;
      }

      try {
        const nextCatalog = await fetchIntegrationCatalog(currentOrganization.id, currentWorkspace.id);
        if (!cancelled && nextCatalog) {
          setCatalog(nextCatalog);
        }
      } catch {
        if (!cancelled) {
          setCatalog(EMPTY_CATALOG);
        }
      }
    }

    loadCatalog();

    return () => {
      cancelled = true;
    };
  }, [currentOrganization?.id, currentWorkspace?.id, isMockMode, fetchIntegrationCatalog]);

  // Sync local state from store
  useEffect(() => {
    if (isMockMode) {
      return;
    }

    if (integrationsData && integrationsData.length > 0) {
      const sources = integrationsData
        .filter((i) => i.flow === 'source' || !i.flow)
        .map(mapApiIntegrationToUI);
      const destinations = integrationsData
        .filter((i) => i.flow === 'destination')
        .map(mapApiIntegrationToUI);
      Promise.resolve().then(() => {
        if (sources.length > 0) setConnectedSources(sources);
        if (destinations.length > 0) setConnectedDestinations(destinations);
      });
    }
  }, [integrationsData, isMockMode]);

  const effectiveCatalog = isMockMode ? connectorsData : catalog;
  const effectiveConnectedSources = connectedSources;
  const effectiveConnectedDestinations = connectedDestinations;

  const sourceCategoriesData = effectiveCatalog?.sourceCategories || EMPTY_CATALOG.sourceCategories;
  const destinationCategoriesData = effectiveCatalog?.destinationCategories || EMPTY_CATALOG.destinationCategories;
  const featuredDestinations = effectiveCatalog?.featuredDestinations || EMPTY_CATALOG.featuredDestinations;
  const hasFeaturedDestinations = featuredDestinations.length > 0;

  const sourceOptions = useMemo(
    () => buildConnectorOptions(sourceCategoriesData, 'source'),
    [sourceCategoriesData]
  );
  const destinationOptions = useMemo(
    () => buildConnectorOptions(destinationCategoriesData, 'destination'),
    [destinationCategoriesData]
  );

  const connectorOptions = flowType === 'source' ? sourceOptions : destinationOptions;
  const [selectedConnector, setSelectedConnector] = useState(null);
  const [formState, setFormState] = useState({
    authMethod: authOptions[0],
    credentials: '',
    notes: '',
  });

  const authSelectOptions = authOptions.map((option) => ({
    value: option,
    label: option,
  }));

  const openSheet = (flow, connectorName = '') => {
    if (flow === 'destination' && !destinationsEnabled) {
      return;
    }

    const options = flow === 'source' ? sourceOptions : destinationOptions;
    const matched = options.find((item) => item.name === connectorName) ?? options[0] ?? null;

    setFlowType(flow);
    setSelectedConnector(matched);
    setFormState({
      authMethod: authOptions[0],
      credentials: '',
      notes: '',
    });
    setDetailOpen(true);
  };

  const handleFormChange = (field, value) => {
    setFormState((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selectedConnector) {
      return;
    }

    const record = buildConnectionRecord(formState, selectedConnector);

    // Add to local state immediately for responsive UI
    if (flowType === 'source') {
      setConnectedSources((current) => [record, ...current]);
    } else {
      setConnectedDestinations((current) => [record, ...current]);
    }

    // Persist to backend
    if (currentOrganization?.id && currentWorkspace?.id) {
      try {
        await createIntegration(currentOrganization.id, currentWorkspace.id, {
          name: record.name,
          flow: flowType,
          type: record.type,
          connectorName: record.connectorName,
          authMethod: record.authMethod,
          scope: record.scope,
          note: record.note,
        });
      } catch (err) {
        alert('Failed to save integration: ' + err.message);
      }
    }

    setDetailOpen(false);
  };

  const handleRemoveConnection = async (flow, id) => {
    if (flow === 'source') {
      setConnectedSources((current) => current.filter((item) => item.id !== id));
    } else {
      setConnectedDestinations((current) => current.filter((item) => item.id !== id));
    }

    if (currentOrganization?.id && currentWorkspace?.id) {
      try {
        await deleteIntegration(currentOrganization.id, currentWorkspace.id, id);
      } catch (err) {
        alert('Failed to remove integration: ' + err.message);
      }
    }
  };

  const getConnection = (connectorName) => {
    const key = connectorName.toLowerCase();
    const source = effectiveConnectedSources.find(
      (c) => (c.connectorName || c.name)?.toLowerCase() === key
    );
    if (source) return { isConnected: true, flow: 'source', id: source.id, record: source };

    const dest = effectiveConnectedDestinations.find(
      (c) => (c.connectorName || c.name)?.toLowerCase() === key
    );
    if (dest) return { isConnected: true, flow: 'destination', id: dest.id, record: dest };

    return { isConnected: false };
  };

  const connectionMeta = useMemo(() => {
    if (!selectedConnector) return { isConnected: false, flow: null, id: null };
    return getConnection(selectedConnector.name);
  }, [selectedConnector, effectiveConnectedSources, effectiveConnectedDestinations]);

  const handleDisconnect = () => {
    if (connectionMeta.isConnected) {
      handleRemoveConnection(connectionMeta.flow, connectionMeta.id);
    }
  };

  return (
    <>
      <ViewFrame
        title={detailOpen ? null : "Destinations"}
        description={detailOpen ? null : "Manage data destinations — where your processed data is sent."}
        maxWidthClassName="max-w-3xl"
      >
        {detailOpen ? (
          <IntegrationConnectionPage
            flowType={flowType}
            isConnected={connectionMeta.isConnected}
            selectedConnector={selectedConnector}
            authSelectOptions={authSelectOptions}
            formState={formState}
            onFormChange={handleFormChange}
            onSubmit={handleSubmit}
            onDisconnect={connectionMeta.isConnected ? handleDisconnect : null}
            onBack={() => setDetailOpen(false)}
          />
        ) : (
          <div className="integrations-wrapper">
            {!destinationsEnabled ? (
              <div className="integration-disabled-notice" role="status">
                <span className="integration-disabled-notice-kicker">Destinations disabled</span>
                <p className="integration-disabled-notice-copy">
                  When data is loaded from the server, destinations are disabled. They are available only in demo mode.
                </p>
              </div>
            ) : (
              <>
                <div className="integrations-section-head">
                  <h3 className="available-integrations-title">Featured</h3>
                </div>

                {hasFeaturedDestinations ? (
                  <div className="integrations-grid">
                    {featuredDestinations.map((integration) => {
                      const { isConnected, flow, id } = getConnection(integration.connectorName);

                      const openDetail = () => openSheet(integration.flow, integration.name);

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
                          {(() => {
                            const imgSrc = getConnectorImage(integration.name);
                            return imgSrc ? (
                              <div className="integration-icon-container">
                                <img src={imgSrc} alt={integration.name} className="integration-icon-img" />
                              </div>
                            ) : (
                              <div className="integration-icon-container is-empty" />
                            );
                          })()}

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
              </>
            )}
          </div>
        )}
      </ViewFrame>
    </>
  );
}
