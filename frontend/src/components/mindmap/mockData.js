export const mockData = {
    connector: [
        { id: 'src-1', name: 'Production DB', type: 'db' },
        { id: 'src-2', name: 'Billing Events', type: 'events' },
        { id: 'src-3', name: 'Web Analytics', type: 'events' }
    ],
    actionType: [
        // Optional action types if needed
    ],
    adjustedData: [
        {
            id: 'category-1',
            origin_id: 'src-1',
            name: 'Core Users',
            title: 'Core Users',
            columns: [
                { id: 'col-1', name: 'user_id', type: 'string', status: 'ok' },
                { id: 'col-2', name: 'email', type: 'string', status: 'ok' },
                { id: 'col-3', name: 'created_at', type: 'timestamp', status: 'ok' }
            ]
        },
        {
            id: 'category-2',
            origin_id: 'src-2',
            name: 'Payments Derived',
            title: 'Payments Derived',
            columns: [
                { id: 'col-4', name: 'payment_id', type: 'string', status: 'ok' },
                { id: 'col-5', name: 'amount_usd', type: 'float', status: 'warning' },
                { id: 'col-6', name: 'status', type: 'string', status: 'ok' }
            ]
        },
        {
            id: 'category-3',
            origin_id: 'src-3',
            name: 'Web Sessions',
            title: 'Web Sessions',
            columns: [
                { id: 'col-7', name: 'session_id', type: 'string', status: 'ok' },
                { id: 'col-8', name: 'bounce_rate', type: 'float', status: 'error' }
            ]
        }
    ],
    group: [
        { id: 'grp-1', title: 'User Analytics', name: 'User Analytics', activationMode: 'automatic' },
        { id: 'grp-2', title: 'Revenue Tracking', name: 'Revenue Tracking', activationMode: 'manual' }
    ],
    insight: [
        {
            id: 'ins-1',
            title: 'Active Users',
            name: 'Active Users',
            group_id: 'grp-1',
            adjusted_data_columns: ['user_id', 'email'],
            lineage: { source_keys: ['category-1'] }
        },
        {
            id: 'ins-2',
            title: 'Session Duration',
            name: 'Session Duration',
            group_id: 'grp-1',
            adjusted_data_columns: ['session_id'],
            lineage: { source_keys: ['category-3'] }
        },
        {
            id: 'ins-3',
            title: 'MRR Growth',
            name: 'MRR Growth',
            group_id: 'grp-2',
            adjusted_data_columns: ['amount_usd', 'status'],
            lineage: { source_keys: ['category-2'] }
        },
        {
            id: 'ins-4',
            title: 'Bounce Rate Alerts',
            name: 'Bounce Rate Alerts',
            group_id: 'grp-1',
            adjusted_data_columns: ['bounce_rate'],
            lineage: { source_keys: ['category-3'] }
        }
    ],
    mindmapManifest: {
        layers: {
            sources: [],
            groups: [],
            insights: [],
            transformations: {},
            gold: {}
        }
    },
    mindmapYaml: '',
    sourceMetadata: []
};
