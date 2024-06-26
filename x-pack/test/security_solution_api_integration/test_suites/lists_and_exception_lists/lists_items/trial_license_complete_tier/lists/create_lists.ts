/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { LIST_URL } from '@kbn/securitysolution-list-constants';
import {
  getCreateMinimalListSchemaMock,
  getCreateMinimalListSchemaMockWithoutId,
} from '@kbn/lists-plugin/common/schemas/request/create_list_schema.mock';
import { getListResponseMockWithoutAutoGeneratedValues } from '@kbn/lists-plugin/common/schemas/response/list_schema.mock';

import {
  createListsIndex,
  deleteListsIndex,
  removeListServerGeneratedProperties,
} from '../../../utils';

import { FtrProviderContext } from '../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const log = getService('log');
  const config = getService('config');
  const ELASTICSEARCH_USERNAME = config.get('servers.kibana.username');

  describe('@ess @serverless create_lists', () => {
    describe('creating lists', () => {
      beforeEach(async () => {
        await createListsIndex(supertest, log);
      });

      afterEach(async () => {
        await deleteListsIndex(supertest, log);
      });

      it('should create a simple list with a list_id', async () => {
        const { body } = await supertest
          .post(LIST_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateMinimalListSchemaMock())
          .expect(200);

        const bodyToCompare = removeListServerGeneratedProperties(body);
        expect(bodyToCompare).to.eql(
          getListResponseMockWithoutAutoGeneratedValues(ELASTICSEARCH_USERNAME)
        );
      });

      it('should create a simple list without a list_id', async () => {
        const { body } = await supertest
          .post(LIST_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateMinimalListSchemaMockWithoutId())
          .expect(200);

        const bodyToCompare = removeListServerGeneratedProperties(body);
        expect(bodyToCompare).to.eql(
          getListResponseMockWithoutAutoGeneratedValues(ELASTICSEARCH_USERNAME)
        );
      });

      it('should cause a 409 conflict if we attempt to create the same list_id twice', async () => {
        await supertest
          .post(LIST_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateMinimalListSchemaMock())
          .expect(200);

        const { body } = await supertest
          .post(LIST_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateMinimalListSchemaMock())
          .expect(409);

        expect(body).to.eql({
          message: 'list id: "some-list-id" already exists',
          status_code: 409,
        });
      });
    });
  });
};
