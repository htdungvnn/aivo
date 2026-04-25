// Manual mock for victory-native to work with Jest ESM
import React from 'react';
import { View } from 'react-native';

export const VictoryChart = (...args) => React.createElement(View, { testID: 'victory-chart' }, ...args);
export const VictoryLine = (...args) => React.createElement(View, { testID: 'victory-line' }, ...args);
export const VictoryArea = (...args) => React.createElement(View, { testID: 'victory-area' }, ...args);
export const VictoryBar = (...args) => React.createElement(View, { testID: 'victory-bar' }, ...args);
export const VictoryAxis = (...args) => React.createElement(View, { testID: 'victory-axis' }, ...args);
export const VictoryTooltip = (...args) => React.createElement(View, { testID: 'victory-tooltip' }, ...args);
export const VictoryLegend = (...args) => React.createElement(View, { testID: 'victory-legend' }, ...args);
export const VictoryTheme = {
  material: {},
};
export const VictoryVoronoiContainer = (...args) => React.createElement(View, { testID: 'victory-voronoi' }, ...args);
export const VictorySelectionContainer = (...args) => React.createElement(View, { testID: 'victory-selection' }, ...args);
export const VictoryScatter = (...args) => React.createElement(View, { testID: 'victory-scatter' }, ...args);
export const VictoryPie = (...args) => React.createElement(View, { testID: 'victory-pie' }, ...args);
export const VictorySlice = (...args) => React.createElement(View, { testID: 'victory-slice' }, ...args);
export const VictoryLabel = (...args) => React.createElement(View, { testID: 'victory-label' }, ...args);
