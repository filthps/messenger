import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { Link, Redirect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SecureStore from 'expo-secure-store';


get_auth_token = async() {
    if (Platform.OS == "web") {
        // Использовать localStorage или что-то ещё
    }
    return await SecureStore.getItemAsync("auth");
};


export default function App() {
    const [is_auth, set_is_auth] = useState(false);
    const [error_state, set_error] = useState(null);
    const [is_loading, set_loading] = useState(true);
    const [repeat_counter, set_rp_counter] = useState(2);
    const get_auth_status = async(show_indicator=false) => {
        try {
            show_indicator ? set_loading(true) : null;
            const p = await fetch("http://172.20.113.198:8000/msg/check-auth/", {
                method: "GET",
                signal: AbortSignal.timeout(5000),
                headers: {"Authorization": "Token " + get_auth_token()}
            });
            let data = await p.json();
            set_is_auth(data["status"]);
            set_error(null);
            return true
        } catch (err) {
            set_error(true);
        } finally {
            show_indicator ? set_loading(false) : null;
        }
        return false;
    };
    useEffect(() => {
        let cycle = null;
        const check = async() => {
            let success_resp = await get_auth_status(true);
            if (success_resp != true) {
                cycle = setInterval(async() => {
                    let val = await get_auth_status();
                    if (val == true) {
                        clearInterval(cycle);
                        return
                    }
                    set_rp_counter(prev => prev + 1);
                }, 5000);
            } else {
                clearInterval(cycle);
            }
        };
        check();
        return () => {
            if (cycle) clearInterval(cycle);
        };
    }, []);
  return (
    <View style={styles.container}>
        {
            is_loading ? (
                <ActivityIndicator />
            ) : (
                 error_state == null ? (
                    is_auth ? (
                        <Redirect href="/Dialogs" />
                    ) : (
                        <Redirect href="/Login" />
                    )
                ) : <Text>Ошибка соединения с сервером, попытка {repeat_counter}</Text>
            )
        }
    </View>
  )
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
   title: {
      marginTop: 16,
      paddingVertical: 8,
      paddingHorizontal: 4,
      borderWidth: 4,
      borderColor: '#20232a',
      borderRadius: 6,
      backgroundColor: '#61dafb',
      color: '#20232a',
      textAlign: 'center',
      fontSize: 30,
      fontWeight: 'bold',
    },
});
