// Manual mock for @react-native-community/datetimepicker
import React from 'react';
import { View, Text } from 'react-native';

const DateTimePicker = (props) => {
  const { value, mode, display, onChange, maximumDate, minimumDate } = props;
  return (
    <View testID="datetimepicker-mock">
      <Text>DateTimePicker Mock: {mode}</Text>
      <Text>Value: {value.toLocaleDateString()}</Text>
    </View>
  );
};

module.exports = DateTimePicker;
