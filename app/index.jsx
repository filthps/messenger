import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, Platform } from 'react-native';
import { Redirect } from 'expo-router';
import * as SecureStore from 'expo-secure-store';


export const get_auth_token = async() => {
    if (Platform.OS == "web") {
        return localStorage.getItem("auth");
    }
    return await SecureStore.getItemAsync("auth") || null;
};


export const set_auth_token = async(token_val) => {
    if (Platform.OS == "web") {
       localStorage.setItem("auth", token_val);
       return;
    }
    await SecureStore.setItemAsync("auth", token_val);
};


export const remove_auth_token = async() => {
    if (Platform.OS == "web") {
        localStorage.removeItem("auth");
        return;
    }
    await SecureStore.deleteItemAsync("auth");
};


export default function App() {
    const [is_auth, set_is_auth] = useState(false);
    const [error_state, set_error] = useState(null);
    const [is_loading, set_loading] = useState(true);
    const [repeat_counter, set_rp_counter] = useState(2);
    const get_auth_status = async(show_indicator=false) => {
        let val = await get_auth_token();
        let header = val == null ? {} : {"Authorization": "Token " + val};
        try {
            show_indicator ? set_loading(true) : null;
            const p = await fetch("http://10.133.222.198:8000/msg/check-auth/", {
                method: "GET",
                signal: AbortSignal.timeout(5000),
                headers: header
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
                        <Redirect href="/dialogs" />
                    ) : (
                        <Redirect href="/login/login_form" />
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
