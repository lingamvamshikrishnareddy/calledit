import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

const Avatar = ({ source, name, size = 40, style }) => {
  const avatarStyle = [
    styles.avatar,
    { width: size, height: size, borderRadius: size / 2 },
    style
  ];

  const textStyle = [
    styles.text,
    { fontSize: size * 0.4 }
  ];

  if (source) {
    return <Image source={source} style={avatarStyle} />;
  }

  // Generate initials from name
  const initials = name
    ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <View style={[avatarStyle, styles.placeholder]}>
      <Text style={textStyle}>{initials}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  avatar: {
    backgroundColor: '#f0f0f0',
  },
  placeholder: {
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default Avatar;