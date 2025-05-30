/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  ELASTIC_HTTP_VERSION_HEADER,
  X_ELASTIC_INTERNAL_ORIGIN_REQUEST,
} from '@kbn/core-http-common';
import path from 'path';
import { copyFile, rm } from 'fs/promises';
import type { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const log = getService('log');

  describe('fonts', () => {
    // [HACK]: On CI tests are run from the different directories than the built and running Kibana
    // instance. To workaround that we use Kibana `process.cwd()` to construct font path manually.
    // x-pack tests can be run from root directory or from within x-pack so need to cater for both possibilities.
    const fontPath = path.join(
      process.cwd().replace(/x-pack.*$/, ''),
      'x-pack/platform/plugins/shared/maps/server/fonts/open_sans/0-255.pbf'
    );
    const destinationPath = path.join(path.dirname(fontPath), '..', path.basename(fontPath));

    before(async () => {
      log.debug(`Copying test file from '${fontPath}' to '${destinationPath}'`);
      await copyFile(fontPath, destinationPath);
    });

    after(async () => {
      log.debug(`Removing test file '${destinationPath}'`);
      await rm(destinationPath);
    });

    it('should return fonts', async () => {
      const resp = await supertest
        .get(`/internal/maps/fonts/Open%20Sans%20Regular,Arial%20Unicode%20MS%20Regular/0-255`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .expect(200);

      expect(resp.body.length).to.be(74696);
    });

    it('should return 404 when file not found', async () => {
      await supertest
        .get(
          `/internal/maps/fonts/Open%20Sans%20Regular,Arial%20Unicode%20MS%20Regular/noGonaFindMe`
        )
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .expect(404);
    });

    it('should return 404 when file is not in font folder (..)', async () => {
      await supertest
        .get(`/internal/maps/fonts/open_sans/..%2f0-255`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .expect(404);
    });

    it('should return 404 when file is not in font folder (./..)', async () => {
      await supertest
        .get(`/internal/maps/fonts/open_sans/.%2f..%2f0-255`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .expect(404);
    });
  });
}
