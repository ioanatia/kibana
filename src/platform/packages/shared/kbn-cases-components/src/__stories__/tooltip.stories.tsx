/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { StoryObj, Meta } from '@storybook/react';

import { CaseStatuses } from '../status/types';
import { Tooltip } from '../tooltip/tooltip';
import type { CaseTooltipProps, CaseTooltipContentProps } from '../tooltip/types';

const sampleText = 'This is a test span element!!';
const TestSpan = () => (
  <a href="https://www.elastic.co/">
    <span data-test-subj="sample-span">{sampleText}</span>
  </a>
);

const tooltipContent: CaseTooltipContentProps = {
  title: 'Unusual process identified',
  description: 'There was an unusual process while adding alerts to existing case.',
  createdAt: '2020-02-19T23:06:33.798Z',
  createdBy: {
    fullName: 'Elastic User',
    username: 'elastic',
  },
  totalComments: 10,
  status: CaseStatuses.open,
};

const tooltipProps: CaseTooltipProps = {
  children: <TestSpan />,
  loading: false,
  content: tooltipContent,
};

const longTitle = `Lorem Ipsum is simply dummy text of the printing and typesetting industry.
  Lorem Ipsum has been the industry standard dummy text ever since the 1500s!! Lorem!!!`;

const longDescription = `Lorem Ipsum is simply dummy text of the printing and typesetting industry.
  Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer
  took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries,
  but also the leap into electronic typesetting, remaining essentially unchanged.`;

const Template = (args: CaseTooltipProps) => (
  <I18nProvider>
    <Tooltip {...args}>
      <TestSpan />
    </Tooltip>
  </I18nProvider>
);

export default {
  title: 'CaseTooltip',
  component: Template,
} as Meta<typeof Template>;

export const Default: StoryObj<typeof Template> = {
  render: Template,
  args: { ...tooltipProps },
};

export const LoadingState: StoryObj<typeof Template> = {
  render: Template,
  args: { ...tooltipProps, loading: true },
};

export const LongTitle: StoryObj<typeof Template> = {
  render: Template,
  args: { ...tooltipProps, content: { ...tooltipContent, title: longTitle } },
};

export const LongDescription: StoryObj<typeof Template> = {
  render: Template,

  args: {
    ...tooltipProps,
    content: { ...tooltipContent, description: longDescription },
  },
};

export const InProgressStatus: StoryObj<typeof Template> = {
  render: Template,

  args: {
    ...tooltipProps,
    content: { ...tooltipContent, status: CaseStatuses['in-progress'] },
  },
};

export const ClosedStatus: StoryObj<typeof Template> = {
  render: Template,

  args: {
    ...tooltipProps,
    content: { ...tooltipContent, status: CaseStatuses.closed },
  },
};

export const NoUserInfo: StoryObj<typeof Template> = {
  render: Template,
  args: { ...tooltipProps, content: { ...tooltipContent, createdBy: {} } },
};

export const FullName: StoryObj<typeof Template> = {
  render: Template,

  args: {
    ...tooltipProps,
    content: { ...tooltipContent, createdBy: { fullName: 'Elastic User' } },
  },
};

export const LongUserName: StoryObj<typeof Template> = {
  render: Template,

  args: {
    ...tooltipProps,
    content: {
      ...tooltipContent,
      createdBy: { fullName: 'LoremIpsumElasticUser WithALongSurname' },
    },
  },
};
