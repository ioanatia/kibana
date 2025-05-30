/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type OpenAI from 'openai';
import { testHasEmbeddedConsole } from '../embedded_console';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { RoleCredentials } from '../../../../shared/services';
import { createOpenAIConnector } from './utils/create_openai_connector';
import { createLlmProxy, LlmProxy } from './utils/create_llm_proxy';

const esArchiveIndex =
  'src/platform/test/api_integration/fixtures/es_archiver/index_patterns/basic_index';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const pageObjects = getPageObjects([
    'svlCommonPage',
    'svlCommonNavigation',
    'searchPlayground',
    'embeddedConsole',
  ]);
  const svlSearchNavigation = getService('svlSearchNavigation');
  const svlCommonApi = getService('svlCommonApi');
  const svlUserManager = getService('svlUserManager');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');
  const log = getService('log');
  const browser = getService('browser');
  const retry = getService('retry');
  const createIndex = async () => await esArchiver.load(esArchiveIndex);
  let roleAuthc: RoleCredentials;

  describe('Serverless Playground Overview', function () {
    // see details: https://github.com/elastic/kibana/issues/183893
    this.tags(['failsOnMKI']);

    let removeOpenAIConnector: () => Promise<void>;
    let createConnector: () => Promise<void>;
    let proxy: LlmProxy;

    before(async () => {
      proxy = await createLlmProxy(log);
      await pageObjects.svlCommonPage.loginWithRole('admin');

      const requestHeader = svlCommonApi.getInternalRequestHeader();
      roleAuthc = await svlUserManager.createM2mApiKeyWithRoleScope('admin');
      createConnector = async () => {
        removeOpenAIConnector = await createOpenAIConnector({
          supertest: supertestWithoutAuth,
          requestHeader,
          apiKeyHeader: roleAuthc.apiKeyHeader,
          proxy,
        });
      };
    });
    beforeEach(async () => {
      await svlSearchNavigation.navigateToSearchPlayground();
    });

    after(async () => {
      try {
        await removeOpenAIConnector?.();
      } catch {
        // we can ignore  if this fails
      }
      await esArchiver.unload(esArchiveIndex);
      proxy.close();
      await svlUserManager.invalidateM2mApiKeyWithRoleScope(roleAuthc);
    });

    describe('setup Page', () => {
      it('is loaded successfully', async () => {
        await pageObjects.searchPlayground.PlaygroundStartChatPage.expectPlaygroundHeaderComponentsToExist();
        await pageObjects.searchPlayground.PlaygroundStartChatPage.expectPlaygroundHeaderComponentsToDisabled();
        await pageObjects.searchPlayground.PlaygroundStartChatPage.expectPlaygroundStartChatPageComponentsToExist();
        await pageObjects.searchPlayground.PlaygroundStartChatPage.expectPlaygroundStartChatPageIndexButtonExists();
      });

      describe('with gen ai connectors', () => {
        before(async () => {
          await createConnector();
          await browser.refresh();
        });

        after(async () => {
          await removeOpenAIConnector?.();
          await browser.refresh();
        });
        it('show success llm button', async () => {
          await pageObjects.searchPlayground.PlaygroundStartChatPage.expectShowSuccessLLMText();
        });
      });

      describe('without gen ai connectors', () => {
        it('should display the set up connectors button', async () => {
          await pageObjects.searchPlayground.PlaygroundStartChatPage.expectAddConnectorButtonExists();
        });

        it('creates a connector successfully', async () => {
          await pageObjects.searchPlayground.PlaygroundStartChatPage.expectOpenConnectorPagePlayground();
          await pageObjects.searchPlayground.PlaygroundStartChatPage.expectSuccessButtonAfterCreatingConnector(
            createConnector
          );
        });

        after(async () => {
          await removeOpenAIConnector?.();
          await browser.refresh();
        });
      });

      describe('without any indices', () => {
        it('hide create index button when index added', async () => {
          await createIndex();
          await pageObjects.searchPlayground.PlaygroundStartChatPage.expectOpenFlyoutAndSelectIndex();
        });

        after(async () => {
          await esArchiver.unload(esArchiveIndex);
          await browser.refresh();
        });
      });

      describe('with existing indices', () => {
        before(async () => {
          await createConnector();
          await createIndex();
        });

        beforeEach(async () => {
          await pageObjects.searchPlayground.session.setSession();
          await browser.refresh();
        });

        it('can select index from dropdown and load chat page', async () => {
          await pageObjects.searchPlayground.PlaygroundStartChatPage.expectToSelectIndicesAndLoadChat();
        });

        it('load start page after removing selected index', async () => {
          await pageObjects.searchPlayground.PlaygroundStartChatPage.expectToSelectIndicesAndLoadChat();
          await esArchiver.unload(esArchiveIndex);
          await browser.refresh();
          await pageObjects.searchPlayground.PlaygroundStartChatPage.expectCreateIndexButtonToExists();
        });

        after(async () => {
          await removeOpenAIConnector?.();
          await esArchiver.unload(esArchiveIndex);
          await browser.refresh();
        });
      });
    });

    describe('chat page', () => {
      before(async () => {
        await createConnector();
        await createIndex();
        await browser.refresh();
        await pageObjects.searchPlayground.session.clearSession();
        await pageObjects.searchPlayground.PlaygroundChatPage.navigateToChatPage();
      });
      it('loads successfully', async () => {
        await pageObjects.searchPlayground.PlaygroundChatPage.expectChatWindowLoaded();
      });

      describe('chat', () => {
        it('works', async () => {
          const conversationInterceptor = proxy.intercept(
            'conversation',
            (body) =>
              (JSON.parse(body) as OpenAI.Chat.ChatCompletionCreateParamsNonStreaming).tools?.find(
                (fn) => fn.function.name === 'title_conversation'
              ) === undefined
          );

          await pageObjects.searchPlayground.session.expectSession();

          await pageObjects.searchPlayground.PlaygroundChatPage.sendQuestion();

          const conversationSimulator = await conversationInterceptor.waitForIntercept();

          await conversationSimulator.next('My response');

          await conversationSimulator.complete();

          await pageObjects.searchPlayground.PlaygroundChatPage.expectChatWorks();
          await pageObjects.searchPlayground.PlaygroundChatPage.expectTokenTooltipExists();
        });

        it('open view code', async () => {
          await pageObjects.searchPlayground.PlaygroundChatPage.expectOpenViewCode();
        });

        it('show edit context', async () => {
          await pageObjects.searchPlayground.PlaygroundChatPage.openChatMode();
          await pageObjects.searchPlayground.PlaygroundChatPage.expectEditContextOpens(
            'basic_index',
            ['bar', 'baz', 'baz.keyword', 'foo', 'nestedField', 'nestedField.child']
          );
        });

        it('save selected fields between modes', async () => {
          await pageObjects.searchPlayground.PlaygroundChatPage.expectSaveFieldsBetweenModes();
        });

        it('show fields and code in view query', async () => {
          await pageObjects.searchPlayground.PlaygroundQueryPage.openQueryMode();
          await pageObjects.searchPlayground.PlaygroundQueryPage.expectViewQueryHasFields();
        });

        it('allows running the elasticsearch query', async () => {
          await pageObjects.searchPlayground.PlaygroundQueryPage.openQueryMode();
          await pageObjects.searchPlayground.PlaygroundQueryPage.setQueryModeQuestion('hello');
          await pageObjects.searchPlayground.PlaygroundQueryPage.expectCanRunQuery();
          await pageObjects.searchPlayground.PlaygroundQueryPage.expectQueryModeResultsContains(
            '"took":'
          );
        });

        it('allows user to edit the elasticsearch query', async () => {
          await pageObjects.searchPlayground.PlaygroundQueryPage.openQueryMode();
          const newQuery = `{"query":{"multi_match":{"query":"{query}","fields":["baz"]}}}`;
          await pageObjects.searchPlayground.PlaygroundQueryPage.expectCanEditElasticsearchQuery(
            newQuery
          );
          await pageObjects.searchPlayground.PlaygroundQueryPage.resetElasticsearchQuery();
          await pageObjects.searchPlayground.PlaygroundQueryPage.expectQueryCodeToBe(
            '{\n"retriever":{\n"standard":{\n"query":{\n"multi_match":{\n"query":"{query}",\n"fields":[\n"baz"\n]\n}\n}\n}\n}\n}'
          );
        });

        it('loads a session from localstorage', async () => {
          await pageObjects.searchPlayground.session.setSession();
          await browser.refresh();
          await pageObjects.searchPlayground.PlaygroundChatPage.navigateToChatPage();
          await pageObjects.searchPlayground.PlaygroundChatPage.expectPromptToBe(
            'You are a fireman in london that helps answering question-answering tasks.'
          );
        });

        it("saves a session to localstorage when it's updated", async () => {
          await pageObjects.searchPlayground.session.setSession();
          await browser.refresh();
          await pageObjects.searchPlayground.PlaygroundChatPage.navigateToChatPage();
          await pageObjects.searchPlayground.PlaygroundChatPage.updatePrompt("You're a doctor");
          await pageObjects.searchPlayground.PlaygroundChatPage.updateQuestion('i have back pain');
          // wait for session debounce before trying to load new session state.
          await retry.try(
            async () => {
              await pageObjects.searchPlayground.session.expectInSession(
                'prompt',
                "You're a doctor"
              );
              await pageObjects.searchPlayground.session.expectInSession('question', undefined);
            },
            undefined,
            200
          );
        });

        it('click on manage connector button', async () => {
          await pageObjects.searchPlayground.PlaygroundChatPage.clickManageButton();
        });
      });

      after(async () => {
        await removeOpenAIConnector?.();
        await esArchiver.unload(esArchiveIndex);
        await browser.refresh();
      });
    });

    it('has embedded console', async () => {
      await testHasEmbeddedConsole(pageObjects);
    });

    describe('connectors enabled on serverless search', () => {
      it('has all LLM connectors', async () => {
        await pageObjects.searchPlayground.PlaygroundStartChatPage.expectOpenConnectorPagePlayground();
        await pageObjects.searchPlayground.PlaygroundStartChatPage.expectPlaygroundLLMConnectorOptionsExists();
      });
    });
  });
}
