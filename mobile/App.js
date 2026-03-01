import React from 'react';
import { SafeAreaView, StyleSheet, Platform } from 'react-native';
import { WebView } from 'react-native-webview';

export default function App(){
  const url = Platform.OS === 'web' ? '/frontend/index.html' : 'https://your-host/frontend/index.html';
  // For local dev: serve frontend and set URL to that server
  return (
    <SafeAreaView style={styles.container}>
      <WebView source={{ uri: url }} style={{flex:1}} />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {flex:1, backgroundColor:'#000'}
})
