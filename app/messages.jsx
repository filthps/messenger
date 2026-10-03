import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, FlatList, Pressable, Image, TouchableOpacity, Modal, Button, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { useRouter, Link, useLocalSearchParams } from 'expo-router';
import { Checkbox } from 'expo-checkbox';
import { host, get_auth_token } from './index';


function Message({item, next_item}) {
    const get_days_from_ms = (t) => {
        return t / 1000 / 60 / 24;
    };
    let prev_message_time;
    let prev_message_month_num;
    let prev_message_owner_id;
    if (next_item == null) {
        prev_message_time = null;
        prev_message_month_num = null;
        prev_message_owner_id = null;
    } else {
        prev_message_time = new Date(next_item["time"]);
        prev_message_month_num = prev_message_time.getUTCMonth();
        prev_message_owner_id = next_item["owner"];
    }
    let message_id = item["id"];
    let raw = item["raw"];
    let author_id = item["owner"];
    let key_tail = item["key_info"];
    let time = new Date(item["time"]);
    let edit_time = item["edit_time"];
    let is_my_message = item["is_mine"];
    let avatar = item["owner__dialog_thumb"];
    let author = item["owner__username"];

    let is_change_messages_block = prev_message_owner_id != author_id;
    let days_between_message = prev_message_time == null ? 0 : get_days_from_ms(time - prev_message_time);
    let current_message_month_num = time.getUTCMonth();
    let show_year_block = prev_message_month_num == 11 & current_message_month_num == 0 ? true : false;
    let show_month_block = current_message_month_num - prev_message_month_num > 0 ? true : false;
    let show_day_block = days_between_message > 0 ? true : false;
    return (
            <>
                {is_change_messages_block ? (
                    <View style={styles.separator}></View>
                ) : null}
                {is_my_message ? (
                    <View style={styles.message_item_left}>
                        {is_change_messages_block ? (
                            <View style={styles.author_left}>
                                {avatar == null ? (
                                    <View style={styles.default_th_image}><Text>{author}</Text></View>
                                ) : (
                                    <Image source={{uri: avatar}} style={styles.th_image} />
                                )}
                                <Text style={styles.username}>{author}</Text>
                            </View>
                        ) : null}
                        <View style={styles.message_body_left}>
                            <Text>{raw}</Text>
                        </View>
                    </View>
                ) : (
                    <View style={styles.message_item_right}>
                        {is_change_messages_block ? (
                            <View style={styles.author_right}>
                                {avatar == null ? (
                                    <View style={styles.default_th_image}><Text>{author}</Text></View>
                                ) : (
                                    <Image source={{uri: avatar}} style={styles.th_image} />
                                )}
                                <Text style={styles.username}>{author}</Text>
                            </View>
                        ) : null}
                        <View style={styles.message_body_right}>
                            <Text>{raw}</Text>
                        </View>
                    </View>
                )}
        </>
    )
}


export default function Messages() {  // В обычном react-native dialog-id передавали бы сюда
    const router = useRouter();
    const [messages, set_messages] = useState([]);
    const [page_counter, set_page] = useState(1);
    const [is_loading, set_loading] = useState(false);
    const [invalid_service, set_invalid] = useState(false);
    const [rest_error_code, set_code] = useState(null);
    const {dialog_id} = useLocalSearchParams();  // Это только потому, что Expo

    const load_messages = async() => {
        if (page_counter == null || is_loading) {
            return true
        }
        page_counter == 1 ? set_loading(true) : null;
        let t_val = await get_auth_token();
        let header = t_val == null ? {} : {"Authorization": "Token " + t_val};
        let req;
        let current_page = page_counter == 1 ? "" : "?group=" + page_counter;
        try {
            req = await fetch(host + "/msg/dialog/" + dialog_id + "/" + current_page, {
                method: "GET",
                signal: AbortSignal.timeout(5000),
                headers: header,
            });
        } catch (_) {
            set_loading(false);
            return false;
        }
        if (!req.ok) {
            if (req.status == 401) {
                router.replace("/login");
                return true;
            }
            set_code(req.status);
            set_invalid(true);
            set_loading(false);
            return true;
        }
        let data;
        try {
            data = await req.json();
        } catch (_) {
            set_invalid(true);
            set_loading(false);
            return true;
        }
        if (!Object.hasOwn(data, "results") || !Object.hasOwn(data, "next") ||
            !Object.hasOwn(data, "previous")) {
            set_invalid(true);
            set_loading(false);
            return true;
        }
        if (data["next"] == null) {
            set_page(null);
        } else {
            set_page(page_counter + 1);
        }
        let loaded_messages = messages;
        let messages_json_list = data["results"];
        if (!messages_json_list.length) {
            set_loading(false);
            return true;
        }
        set_messages([...loaded_messages, ...messages_json_list]); // Всегда в пропс нужно ставить новый экземпляр, если тип мутабелен
        set_loading(false);
        return true;
    };
    useEffect(() => {
        let interval = null;
        const refresh = async() => {
            let status = await load_messages();
            if (status) {
                return
            }
            interval = setInterval(async() => {
                status = await load_messages();
                if (status) {
                    clearInterval(interval);
                }
            }, 5000);
        };
        refresh();
        return () => {
            interval == null ? null : clearInterval(interval);
            set_messages([]);
            set_page(1);
            set_invalid(false);
            set_code(null);
        };
    }, [dialog_id]);
    return (
        <>
            {is_loading ? (
                <View style={styles.container}>
                    <ActivityIndicator />
                </View>
            ) : null}
            {invalid_service ? (
                <View style={styles.container_error}>
                    {rest_error_code == 404 ? (
                        <>
                            <Text>Диалог удалён</Text>
                            <Link href="/dialogs">Вернуться к списку диалогов</Link>
                        </>
                    ) : (
                        <Text>Сервис недоступен</Text>
                    )}
                </View>
            ) : (
                    <View style={styles.container}>
                        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                                                        style={styles.input_wrapper} keyboardVerticalOffset={90}>

                            <FlatList data={messages} onEndReached={load_messages}
                                ListFooterComponent={is_loading ? <ActivityIndicator /> : null}
                                renderItem={({item, index}) => {
                                    const next = index < messages.length - 1 ? messages[index + 1] : null;
                                    return <Message item={item} next_item={next} />
                                    }
                                } onEndReachedThreshold={0.1} inverted={true} />
                            <SafeAreaProvider>
                                <SafeAreaView style={styles.send_block} edges={['top', 'left', 'right']}>
                                    <TextInput style={styles.msg_input} multiline={true} />
                                </SafeAreaView>
                            </SafeAreaProvider>
                        </KeyboardAvoidingView>
                    </View>
            )}
        </>
    )
}


const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        alignItems: 'stretch',
        justifyContent: 'stretch',
    },
    container_error: {
        flex: 1,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    message_item_left: {
        flexDirection: "column",
        justifyContent: 'flex-start',
        alignSelf: 'flex-start', // Прижимает блок к ЛЕВОМУ краю
        marginTop: 15,
        marginLeft: 10,
    },
    author_left: {
        alignSelf: 'flex-start',
        marginBottom: 20,
    },
    separator: {
        marginVertical: 15,
    },
    message_item_right: {
        flexDirection: "column",
        justifyContent: 'flex-start',
        alignSelf: 'flex-end', // Прижимает блок к ПРАВОМУ краю
        marginTop: 15,
        marginRight: 10,
    },
    author_right: {
        alignSelf: 'flex-end', // Прижимает блок к ПРАВОМУ краю
        marginBottom: 20,
    },
    input_wrapper: {
        justifyContent: 'flex-end',
    },
    send_block: {
        flex: 2,
        flexDirection: 'row',
        alignItems: 'stretch',
        justifyContent: 'space-around',
        opacity: 0.1,
    },
    msg_input: {
        height: 50,
        width: 150,
        marginBottom: 50,
        borderWidth: 4,
        borderRadius: 6,
        backgroundColor: '#61dafb',
        color: '#20232a',
        textAlign: 'left',
        fontSize: 16,
        fontWeight: 'bold',
    },
    default_th_image: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 50,
        height: 50,
        backgroundColor: '#bbbbed',
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: '#7b7aed',
        borderRadius: 25,
        color: '#7b7aed',
        margin: 5
        },
    th_image: {
        width: 50,
        height: 50,
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: '#777777',
        borderRadius: 25,
        margin: 5,
    },
    username: {
        fontSize: 18,
        textAlign: "center",
    },
    message_body_left: {
        maxWidth: '75%',          // Сообщение не растягивается больше чем на 75% экрана
        backgroundColor: '#f0f0f0', // Задний фон для чужих сообщений
        padding: 15,
        borderRadius: 5,
    },
    message_body_right: {
        maxWidth: '75%',          // Сообщение не растягивается больше чем на 75% экрана
        backgroundColor: '#999', // Задний фон для чужих сообщений
        padding: 15,
        borderRadius: 5,
    },
});
