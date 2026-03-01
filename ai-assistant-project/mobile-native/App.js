import React from 'react'
import { SafeAreaView, StyleSheet, Platform } from 'react-native'
import { WebView } from 'react-native-webview'

export default function App(){
  const url = Platform.OS === 'android' || Platform.OS === 'ios'
    ? 'https://your-host/frontend/index.html' // replace with deployed URL or local tunnel
    : 'http://localhost:5173'

  return (
    <SafeAreaView style={styles.container}>
      <WebView source={{ uri: url }} style={{flex:1}} />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({container:{flex:1, backgroundColor:'#000'}})
