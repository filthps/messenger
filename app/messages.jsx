import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, FlatList, Pressable, Image, TouchableOpacity, Modal, Button, TextInput,
    KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { useRouter, Link, useLocalSearchParams } from 'expo-router';
import { Checkbox } from 'expo-checkbox';
import { host, get_auth_token } from './index';


function Message({item, next_item}) {
    const get_days_from_ms = (t) => {
        return t / (1000 * 60 * 60 * 24);
    };

    let next_message_time;
    let next_message_month_num;
    let next_message_owner_id;
    if (next_item == null) {
        next_message_time = null;
        next_message_month_num = null;
        next_message_owner_id = null;
    } else {
        next_message_time = new Date(next_item["time"]);
        next_message_month_num = next_message_time.getUTCMonth();
        next_message_owner_id = next_item["owner"];
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

    let is_change_messages_block = next_message_owner_id != author_id;
    let days_between_message = get_days_from_ms(next_message_time - time);
    let current_message_month_num = time.getUTCMonth();
    let show_year_block = next_message_month_num == 11 & current_message_month_num == 0 ? true : false;
    let show_month_block = current_message_month_num - next_message_month_num > 0 ? true : false;
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
                                    <Image source={{uri: host + avatar}} style={styles.th_image} />
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
    const is_valid_json = async(data) => {
        const required_fields = ["id", "owner", "raw", "key_info", "time", "edit_time",
            "is_edit", "owner__username", "owner__dialog_thumb", "is_mine"];
        return required_fields.every(field => Object.hasOwn(data, field));
    };

    const {dialog_id} = useLocalSearchParams();  // Это только потому, что Expo
    const router = useRouter();
    const [messages, set_messages] = useState([]);
    const [page_counter, set_page] = useState(1);
    const [is_loading, set_loading] = useState(false);
    const [invalid_service, set_invalid] = useState(false);
    const [rest_error_code_or_reason, set_error_code_or_reason] = useState(null);
    const [keyboard_h, set_keyboard_height] = useState(60);
    const [get_opacity, change_opacity] = useState(false);
    const [draft, change_draft] = useState("");  // Черновик сообщения
    const [is_active_send, set_is_active_send_msg] = useState(false);
    const [error_send, set_send_with_error] = useState(false);
    let fade_send_block = null;
    let show_send_block = null;
    let show_subscription = null;
    let hide_subscription = null;

    const load_messages = async() => {
        if (page_counter == null || is_loading) {
            return true;
        }
        set_loading(true);
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
            set_error_code_or_reason(req.status);
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
        let messages_json_list = data["results"];
        for (var i = 0; i < messages_json_list.length - 1; i++) {
            if (!await is_valid_json(messages_json_list[i])) {
                set_invalid(true);
                set_loading(false);
                return true;
            }
        }
        let loaded_messages = messages;
        if (page_counter == 1 && load_messages.length) {
            set_append_message(load_messages[0]);
        }
        if (data["next"] == null) {
            set_page(null);
        } else {
            set_page(page_counter + 1);
        }
        if (!messages_json_list.length) {
            set_loading(false);
            return true;
        }
        set_messages([...loaded_messages, ...messages_json_list]); // Всегда в пропс нужно ставить новый экземпляр, если тип мутабелен
        set_loading(false);
        return true;
    };
    const send = async() => {
        if (is_active_send || draft == "") {
            return
        }
        set_is_active_send_msg(true);
        let token = await get_auth_token();
        let header = {"Accept": "application/json", "Content-Type": "application/json"};
        if (token) {
            header["Authorization"] = "Token " + token;
        }
        let r;
        let data;
        try {
            r = await fetch(host + "/msg/dialog/" + dialog_id + "/send/", {
                method: "POST",
                headers: header,
                signal: AbortSignal.timeout(5000),
                body: JSON.stringify({"raw": draft}),
            });
        } catch (error) {
            set_is_active_send_msg(false);
            set_send_with_error(true);
            return
        }
        if (r.status == 404) {
            set_is_active_send_msg(false);
            set_invalid(true);
            set_error_code_or_reason(404);
            return
        }
        if (r.status == 401) {
            router.replace("/login");
            return
        }
        try {
            data = await r.json();
        } catch (_) {
            set_is_active_send_msg(false);
            set_invalid(true);
            return
        }
        if (r.status == 201) {
            if (!await is_valid_json(data)) {
                set_invalid(true);
                set_loading(false);
                return
            }
            set_is_active_send_msg(false);
            set_send_with_error(false);
            let message_queue = messages;
            message_queue = [data, ...message_queue];
            set_messages(message_queue);
            change_draft("");
            return
        }
        set_is_active_send_msg(false);
        set_invalid(true);
        set_error_code_or_reason(r.status);
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
        if (Platform.OS != "web") {
            const fade_send_block = Keyboard.addListener('keyboardDidShow', (_) => {
                change_opacity(1);
            });
            const show_send_block = Keyboard.addListener('keyboardDidHide', (_) => {
                change_opacity(0.1);
            });
            if (Platform.OS == "android") { // В ios клавитура сдвигает в ...<KeyboardAvoidingView behavior=..., для андроид пришлось писать этот костыль
                const show_subscription = Keyboard.addListener('keyboardDidShow', (event) => {
                    set_keyboard_height(event.endCoordinates.height + 60);
                });
                    const hide_subscription = Keyboard.addListener('keyboardDidHide', (_) => {
                    set_keyboard_height(60);
                });
            }
        }
        return () => {
            interval == null ? null : clearInterval(interval);
            set_messages([]);
            set_page(1);
            set_invalid(false);
            set_error_code_or_reason(null);
            set_keyboard_height(60);
            show_subscription ? show_subscription.remove() : null;
            hide_subscription ? hide_subscription.remove() : null;
            fade_send_block ? fade_send_block.remove() : null;
            show_send_block ? show_send_block.remove() : null;
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
                    {rest_error_code_or_reason == 404 ? (
                        <>
                            <Text>Диалог удалён</Text>
                            <Link href="/dialogs">Вернуться к списку диалогов</Link>
                        </>
                    ) : (
                        <>
                        <Text>Сервис недоступен</Text>
                        <Text>{rest_error_code_or_reason}</Text>
                        </>
                    )}
                </View>
            ) : (
                    <SafeAreaProvider style={styles.main}>
                        <SafeAreaView style={styles.safe_area} edges={['top', 'left', 'right']}>
                            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
                                style={styles.list_body}>
                                    <FlatList data={messages} onEndReached={load_messages}
                                        ListFooterComponent={is_loading ? <ActivityIndicator /> : null}
                                        ListHeaderComponent={<View style={{height: 120}} />}
                                        renderItem={({item, index}) => {
                                            const next = index < messages.length - 1 ? messages[index + 1] : null;
                                            return <Message item={item} next_item={next} />
                                            }
                                        } onEndReachedThreshold={0.1} inverted={true} />
                            </KeyboardAvoidingView>
                            <View style={[styles.actions, {bottom: keyboard_h, opacity: get_opacity == 1 ? 1 : 0.1}]}
                                collapsable={false} // для андроид. запрещает перерисовывать при изменении opacity, что предотвращает повторное срабатывание
                                >
                                <TextInput style={styles.msg_input} multiline={true} onChangeText={change_draft} />
                                <TouchableOpacity onPress={send} disabled={draft == "" ? true : false} >
                                    <Image source={require("../assets/image_c38b924.jpg")} style={styles.send_img} />
                                </TouchableOpacity>
                            </View>
                        </SafeAreaView>
                    </SafeAreaProvider>
            )}
        </>
    )
}


const styles = StyleSheet.create({
    main: {
        flex: 1,
        alignItems: 'stretch',
        justifyContent: 'stretch',
    },
    container: {
        flex: 1,
        backgroundColor: '#fff',
        alignItems: 'stretch',
        justifyContent: 'stretch',
        width: "100%",
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
    list_body: {
        alignSelf: "stretch",
        flex: 1,
    },
    safe_area: {
        flex: 1,
        flexDirection: 'column',
        alignItems: 'center',
    },
    msg_input: {
        height: 50,
        maxHeight: 100, // Чтобы инпут не вырос на весь экран при длинном тексте
        width: 250,
        borderWidth: 4,
        borderRadius: 6,
        backgroundColor: '#61dafb',
        color: '#20232a',
        textAlign: 'left',
        fontSize: 16,
        fontWeight: 'bold',
    },
    actions: { // Блок с абсолютным позиционированием (действия пользователя по отправке сообщения и инпут)
        position: "absolute",
        justifyContent: "space-between",
        flexDirection: "row",
        bottom: 60,
        },
    send_img: {
        width: 50,
        height: 50,
        borderRadius: 25,
        translateX: 0,
        translateY: 0,
        marginHorizontal: 20,
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
