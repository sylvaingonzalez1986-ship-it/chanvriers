import { Text, TextInput, StyleSheet } from 'react-native';

// Store original render methods
const originalTextRender = (Text as any).render;
const originalTextInputRender = (TextInput as any).render;

// Apply Gagalin font globally to all Text components
export function applyGlobalFont() {
  // Patch Text component
  if (originalTextRender) {
    (Text as any).render = function (...args: any[]) {
      const origin = originalTextRender.call(this, ...args);
      const oldProps = origin.props;
      const style = oldProps.style;

      // Flatten style and add fontFamily
      const flatStyle = StyleSheet.flatten(style);
      const newStyle = { fontFamily: 'Gagalin', ...flatStyle };

      return {
        ...origin,
        props: {
          ...oldProps,
          style: newStyle,
        },
      };
    };
  }

  // Patch TextInput component
  if (originalTextInputRender) {
    (TextInput as any).render = function (...args: any[]) {
      const origin = originalTextInputRender.call(this, ...args);
      const oldProps = origin.props;
      const style = oldProps.style;

      // Flatten style and add fontFamily
      const flatStyle = StyleSheet.flatten(style);
      const newStyle = { fontFamily: 'Gagalin', ...flatStyle };

      return {
        ...origin,
        props: {
          ...oldProps,
          style: newStyle,
        },
      };
    };
  }
}
