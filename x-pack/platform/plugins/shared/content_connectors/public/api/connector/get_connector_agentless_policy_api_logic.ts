/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Agent } from '@kbn/fleet-plugin/common';

import { HttpSetup } from '@kbn/core/public';
import { Actions, createApiLogic } from '../api_logic/create_api_logic';

export interface GetConnectorAgentlessPolicyApiArgs {
  connectorId: string;
  http?: HttpSetup;
}

export interface GetConnectorAgentlessPolicyApiResponse {
  policy: {
    id: string;
    name: string;
  };
  agent: Pick<Agent, 'last_checkin_status' | 'id' | 'status'>;
}

export const getConnectorAgentlessPolicy = async ({
  connectorId,
  http,
}: GetConnectorAgentlessPolicyApiArgs): Promise<
  GetConnectorAgentlessPolicyApiResponse | undefined
> => {
  const route = `/internal/content_connectors/${connectorId}/agentless_policy`;

  return await http?.get<GetConnectorAgentlessPolicyApiResponse>(route);
};

export const GetConnectorAgentlessPolicyApiLogic = createApiLogic(
  ['get_connector_agentless_policy'],
  getConnectorAgentlessPolicy
);

export type GetConnectorAgentlessPolicyApiLogicActions = Actions<
  GetConnectorAgentlessPolicyApiArgs,
  GetConnectorAgentlessPolicyApiResponse
>;
