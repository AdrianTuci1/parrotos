import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Check, ChevronsUpDown, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { getConnectorImage } from '@/components/shell/IntegrationLogos';

function ModalSelect({ label, value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const selectedOption = options.find((option) => option.value === value) ?? options[0] ?? null;

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open]);

  return (
    <div className="integration-field" ref={rootRef}>
      <span className="integration-field-label">{label}</span>
      <button
        className="integration-select-trigger"
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
      >
        <span className="integration-select-value">
          {selectedOption ? (
            <>
              <span className="integration-select-label">{selectedOption.label}</span>
              {selectedOption.hint ? (
                <span className="integration-select-hint">{selectedOption.hint}</span>
              ) : null}
            </>
          ) : null}
        </span>
        <ChevronsUpDown size={15} className="integration-select-chevron" />
      </button>

      {open ? (
        <div className="integration-select-menu" role="listbox">
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                className="integration-select-option"
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                <span className="integration-select-option-copy">
                  <span className="integration-select-label">{option.label}</span>
                  {option.hint ? (
                    <span className="integration-select-hint">{option.hint}</span>
                  ) : null}
                </span>
                {isSelected ? <Check size={14} className="integration-select-check" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function IntegrationConnectionPage({
  flowType,
  isConnected,
  authSelectOptions,
  formState,
  onFormChange,
  onSubmit,
  onDisconnect,
  onBack,
  selectedConnector,
}) {
  const integrationLabel = selectedConnector?.name ?? 'Integration';
  const connectorImg = getConnectorImage(selectedConnector?.name);

  return (
    <div className="integration-connection-page">
      <div className="integration-connection-layout">
        <aside className="integration-connection-sidebar">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="integration-back-btn"
            onClick={onBack}
          >
            <ArrowLeft size={14} />
            Back
          </Button>
        </aside>

        <div className="integration-connection-main">
          <div className="integration-connection-toolbar">
            <div className="integration-connection-identity">
              <div className="integration-connection-logo">
                {connectorImg ? (
                  <img src={connectorImg} alt={integrationLabel} className="integration-icon-img" />
                ) : (
                  <span className="integration-connection-logo-fallback">
                    {integrationLabel.slice(0, 1)}
                  </span>
                )}
              </div>
              <div className="integration-connection-identity-copy">
                <span className="integration-connection-source-name">{integrationLabel}</span>
                <span className="integration-connection-source-subtitle">
                  {flowType === 'source' ? 'Source' : 'Destination'}
                </span>
              </div>
            </div>
          </div>

          <div className="integration-connection-card">
        <form className="integration-sheet-form" onSubmit={onSubmit}>
          <div className="integration-form-grid">
            <ModalSelect
              label="Auth method"
              value={formState.authMethod}
              options={authSelectOptions}
              onChange={(nextValue) => onFormChange('authMethod', nextValue)}
            />

            <label className="integration-field">
              <span className="integration-field-label">Credentials / configuration</span>
              <Textarea
                className="integration-textarea"
                value={formState.credentials}
                onChange={(event) => onFormChange('credentials', event.target.value)}
                placeholder='{"apiKey":"••••••••","accountId":"acct_123"}'
              />
            </label>

            <label className="integration-field">
              <span className="integration-field-label">Notes</span>
              <Textarea
                className="integration-textarea"
                value={formState.notes}
                onChange={(event) => onFormChange('notes', event.target.value)}
                placeholder="Optional context shown in the connected integrations list."
              />
            </label>
          </div>

          <div className="integration-sheet-footer">
            {isConnected && onDisconnect ? (
              <Button
                type="button"
                variant="outline"
                className="integration-modal-secondary-btn"
                onClick={() => { onDisconnect(); onBack(); }}
              >
                <Trash2 size={14} />
                Disconnect
              </Button>
            ) : null}
            <Button type="submit" className="integration-modal-primary-btn">
              {isConnected ? 'Update' : 'Connect'}
            </Button>
          </div>
        </form>
          </div>
        </div>
      </div>
    </div>
  );
}
