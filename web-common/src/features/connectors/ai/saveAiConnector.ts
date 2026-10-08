import type { QueryClient } from "@tanstack/query-core";
import { runtimeServicePutFile } from "../../../runtime-client";
import type { RuntimeClient } from "../../../runtime-client/v2";
import { generateYAML, updateParrotYAMLWithAiConnector } from "../code-utils";
import { getFileAPIPathFromNameAndType } from "../../entity-management/entity-mappers";
import { fileArtifacts } from "../../entity-management/file-artifacts";
import { getName } from "../../entity-management/name-utils";
import { ResourceKind } from "../../entity-management/resource-selectors";
import { EntityType } from "../../entity-management/types";
import { navigateToFile } from "../../../layout/navigation/editor-routing";
import {
  getConnectorSchema,
  toConnectorDriver,
} from "../../sources/modal/connector-schemas";
import {
  getSchemaFieldMetaList,
  getSchemaSecretKeys,
  getSchemaStringKeys,
} from "../../templates/schema-utils";
import { maybeInitProject } from "@statsparrot/web-common/features/add-data/manager/steps/connector.ts";
import type { EnvEditSession } from "@statsparrot/web-common/features/env-management/env-edit-session.ts";

async function setAiConnectorInParrotYAML(
  queryClient: QueryClient,
  client: RuntimeClient,
  newConnectorName: string,
): Promise<void> {
  await runtimeServicePutFile(client, {
    path: "statsparrot.yaml",
    blob: await updateParrotYAMLWithAiConnector(
      client,
      queryClient,
      newConnectorName,
    ),
    create: true,
    createOnly: false,
  });
}

/**
 * Save an AI connector directly: write .env, connector YAML, update statsparrot.yaml,
 * and navigate to the new file. Used by AddAiConnectorDialog.
 */
export async function saveAiConnector(
  client: RuntimeClient,
  queryClient: QueryClient,
  schemaName: string,
  formValues: Record<string, string>,
  envEditSession: EnvEditSession,
): Promise<void> {
  const connector = toConnectorDriver(schemaName);
  if (!connector) throw new Error(`Unknown AI connector: ${schemaName}`);

  await maybeInitProject(client);

  const schema = getConnectorSchema(connector.name ?? "");
  const schemaFields = schema
    ? getSchemaFieldMetaList(schema, { step: "connector" })
    : [];
  const schemaSecretKeys = schema
    ? getSchemaSecretKeys(schema, { step: "connector" })
    : [];
  const schemaStringKeys = schema
    ? getSchemaStringKeys(schema, { step: "connector" })
    : [];

  const newConnectorName = getName(
    connector.name as string,
    fileArtifacts.getNamesForKind(ResourceKind.Connector),
  );

  const newConnectorFilePath = getFileAPIPathFromNameAndType(
    newConnectorName,
    EntityType.Connector,
  );

  const connectorYAML = generateYAML(connector, formValues, envEditSession, {
    connectorInstanceName: newConnectorName,
    orderedProperties: schemaFields,
    secretKeys: schemaSecretKeys,
    stringKeys: schemaStringKeys,
    schema: schema ?? undefined,
    fieldFilter: schemaFields
      ? (property) => !("internal" in property && property.internal)
      : undefined,
  });
  await envEditSession.commit();

  // Write connector YAML
  await runtimeServicePutFile(client, {
    path: newConnectorFilePath,
    blob: connectorYAML,
    create: true,
    createOnly: false,
  });

  // Register as the project's AI connector
  await setAiConnectorInParrotYAML(queryClient, client, newConnectorName);

  await navigateToFile(`/${newConnectorFilePath}`);
}
