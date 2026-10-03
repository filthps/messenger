import { useState } from 'react';
import { StyleSheet, Text, View, Button, ActivityIndicator, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { host, set_auth_token, remove_auth_token } from './index';


export default function Login() {
    const [is_sending, set_send_is_active] = useState(false);
    const [load_indicator, set_load_indicator] = useState(false);
    const [is_valid_api, set_available_service] = useState(true);
    const [username, set_username] = useState("");
    const [password, set_password] = useState("");
    const [username_help_text, set_u_help_text] = useState(null);
    const [passw_help_text, set_password_help_text] = useState(null);
    const [form_error_text, set_f_error_text] = useState(null);
    const router = useRouter();

    const send_form = async() => {
        set_send_is_active(true);
        let response;
        try {
            response = await fetch(host + "/msg/auth/", {
                method: "POST",
                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    "username": username,
                    "password": password
                })
            });
        } catch (er) {
            set_send_is_active(false);
            return
        }
        set_send_is_active(false);
        if (!response.ok & !response.status == 400) {
            set_available_service(false);
            return
        }
        let data;
        try {
            data = await response.json();
        } catch (error) {
            set_available_service(false);
            return
            }
        if (!Object.hasOwn(data, "token") &&
            !Object.hasOwn(data, "non_field_errors") &&
            !Object.hasOwn(data, "username") &&
            !Object.hasOwn(data, "password")) {
            set_available_service(false);
            return
        }
        if (Object.hasOwn(data, "token")) {
            await set_auth_token(data["token"]);
            router.replace("/dialogs");
            return
        }
        if (Object.hasOwn(data, "non_field_errors")) {
            let error_str = "";
            for (let i = 0; i < data["non_field_errors"].length; i++) {
                error_str = error_str + data["non_field_errors"][i];
                if (i < data["non_field_errors"] - 1) {
                    error_str = error_str + "/n";
                }
            }
            set_f_error_text(error_str);
        }
        if (Object.hasOwn(data, "username")) {
            set_u_help_text(data["username"]);
        }
        if (Object.hasOwn(data, "password")) {
            set_password_help_text(data["password"]);
        }
    };
    const reset_error_on_field = async(field_prop) => {
        field_prop(null);
        set_f_error_text(null);
        };
    return (
        <View style={styles.container}>
            {is_sending ? (
                <ActivityIndicator />
            ) : null}
            {is_valid_api ? (
                <>
                <View style={styles.inner_container}>
                    <Text style={styles.label_}>Логин:</Text>
                    {username_help_text == null && form_error_text == null ? (
                        <TextInput style={styles.input_} onChangeText={set_username} autoCapitalize="none" autoCorrect={false} />
                    ) : (
                        <>
                        <TextInput style={styles.invalid_input} onChangeText={set_username} autoCapitalize="none"
                        autoCorrect={false} onFocus={() => {reset_error_on_field(set_u_help_text)}} />
                        {username_help_text != null ? (
                            <Text style={styles.small_error_text}>{username_help_text}</Text>
                        ) : null}
                        </>
                    )}
                </View>
                <View style={styles.inner_container}>
                    <Text style={styles.label_}>Пароль:</Text>
                    {passw_help_text == null && form_error_text == null ? (
                        <TextInput style={styles.input_} secureTextEntry={true} autoCapitalize="none" autoCorrect={false} onChangeText={set_password} />
                    ) : (
                        <>
                        <TextInput style={styles.invalid_input} secureTextEntry={true} autoCapitalize="none" autoCorrect={false} onChangeText={set_password}
                         onFocus={() => {reset_error_on_field(set_password_help_text)}} />
                         {passw_help_text != null ? (
                            <Text style={styles.small_error_text}>{passw_help_text}</Text>
                        ) : null}
                        </>
                    )}
                </View>
                {form_error_text != null ? (
                    <View style={styles.inner_container}>
                        <Text style={styles.small_error_text}>{form_error_text}</Text>
                    </View>
                ) : null}
                <Button onPress={send_form} title="Вход" />
                </>
            ) : (
                <Text>Сервис недоступен</Text>
            )}
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
    inner_container: {
        marginBottom: 30,
        alignItems: 'center',
        },
    input_: {
        width: 150,
        marginTop: 10,
        paddingVertical: 8,
        borderWidth: 4,
        borderRadius: 6,
        backgroundColor: '#61dafb',
        color: '#20232a',
        textAlign: 'center',
        fontSize: 30,
        fontWeight: 'bold'
    },
    label_: {
        fontSize: 18
        },
    invalid_input: {
        width: 150,
        marginTop: 10,
        paddingVertical: 8,
        borderWidth: 4,
        borderRadius: 6,
        backgroundColor: '#fe6f88',
        color: '#c2c2c2',
        textAlign: 'center',
        fontSize: 30,
        fontWeight: 'bold'
        },
    small_error_text: {
        fontSize: 10,
        color: '#ad221e'
        },
});
