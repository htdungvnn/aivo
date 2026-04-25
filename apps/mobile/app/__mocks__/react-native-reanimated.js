// Manual mock for react-native-reanimated
import { default as Reanimated } from 'react-native-reanimated/mock';

// Reanimated 3+ requires the default.call override
if (Reanimated && Reanimated.default) {
  Reanimated.default.call = () => {};
}

export default Reanimated;
