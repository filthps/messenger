import { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, FlatList, SectionList, Pressable, Image, TouchableOpacity, Modal, Button, TextInput,
    KeyboardAvoidingView, Platform, Keyboard, Animated, StatusBar } from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { useRouter, Link, useLocalSearchParams } from 'expo-router';
import { Checkbox } from 'expo-checkbox';
import * as Clipboard from 'expo-clipboard';
import { host, get_auth_token } from './index';
import { encrypt_message_item, decrypt_message_item, 
    get_keys, get_current_key_tail, generate_key, is_valid_key_and_tail, set_current_active_key, add_key, remove_current_active_key } from './encryption';

let add_and_check_exists_key;


function KeyListItem({item, set_show_add_key, set_placeholder}) {
    let key_is_banned = item["is_banned"] || false;
    let key_is_undefined = item["key_undefined"] || false;
    let key_is_selected = item["is_current_key"] || false;
    let key = item["end"];
    let key_author = item["creator_username"];
    let create_date = new Date(item["create_date"]);
    let expire_date = item["expire"] == null ? null : new Date(item["expire"]);
    let key_is_out_of_date = expire_date == null ? false : new Date() > expire_date;
    let create_time_str = create_date.getUTCFullYear() + "." + create_date.getUTCMonth() + 1 + "." + create_date.getUTCDate();



    const fill_exists_key = (tail) => {  // Заполнить существующий ключ из списка (по кнопке)
        set_placeholder('********-****-4***-****-*****' + tail);
        set_show_add_key(true);
    };

    const set_active = async(tail) => {
        add_and_check_exists_key("set_active", tail);
    };

    const set_inactive = async(tail) => {
        add_and_check_exists_key("set_inactive", tail);
    };


    return (
        <>
            <Text>{item["sep"]}</Text>
            <View style={styles.keys_table_row}>
                <Text style={styles.keys_table_row_inner_text}>{key}</Text>
                <Text style={styles.keys_table_row_inner_text}>{key_author}</Text>
                <Text style={styles.keys_table_row_inner_text}>{create_time_str}</Text>
                {key_is_banned ? (
                    <>
                        <Text style={styles.keys_table_row_inner_text}>Заблокирован</Text>
                        <Button title="Удалить" style={styles.keys_table_inner_last} />
                    </>
                ) : (
                    key_is_out_of_date ? (
                        <>
                            <Text style={styles.keys_table_row_inner_text}>Просрочен</Text>
                            <Button title="Удалить" style={styles.keys_table_inner_last} />
                        </>
                    ) : (
                        key_is_undefined ? (
                            <>
                                <Text style={styles.keys_table_row_inner_text}>Не готов</Text>
                                <Button title="Заполнить" onPress={() => fill_exists_key(key)} style={styles.keys_table_inner_last} />
                            </>
                        ) : (
                            key_is_selected ? (
                                <>
                                    <Text style={styles.keys_table_row_inner_text}>Установлен</Text>
                                    <Button title="Отключить" style={styles.keys_table_inner_last} onPress={async() => {set_inactive(key)}} />
                                </>
                            ) : (
                                <>
                                    <Text style={styles.keys_table_row_inner_text}>Готов</Text>
                                    <Button title="Установить" style={styles.keys_table_inner_last} onPress={async() => {set_active(key)}} />
                                </>
                            )
                        )
                    )
                )}
            </View>
        </>
    )
};


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
    let msg_time_str = "" + time.getUTCHours() + ":" + time.getUTCMinutes();
    return (
            <>
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
                            <View style = {styles.msg_bottom}>
                                {key_tail == null ? (
                                    <Text style={styles.msg_bottom_text}>Не зашифровано</Text>
                                ) : (
                                    <Text style={styles.msg_bottom_text}>#{key_tail}</Text>
                                )}
                                <Text style={styles.msg_bottom_text}>{msg_time_str}</Text>
                            </View>
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
                            <View style = {styles.msg_bottom}>
                                <Text style={styles.msg_bottom_text}>{msg_time_str}</Text>
                                {key_tail == null ? (
                                    <Text style={styles.msg_bottom_text}>Не зашифровано</Text>
                                ) : (
                                    <Text style={styles.msg_bottom_text}>#{key_tail}</Text>
                                )}
                            </View>
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
    const [keyboard_h, set_keyboard_height] = useState(60);  // Для сдвига action View при подъёме клавиатуры
    const [last_message_height, set_last_msg_h] = useState(120);  // Для сдвига сообщений при подъёме клавиатуры
    const [get_opacity, change_opacity] = useState(false);
    const [draft, change_draft] = useState("");  // Черновик сообщения
    const [is_active_send, set_is_active_send_msg] = useState(false);
    const [error_send, set_send_with_error] = useState(false);
    // Key manager
    const keys_window_visible = useRef(false);
    const current_key = useRef(null);  // Текущий активный ключ, которым шифруются сообщения, end ключа
    const [key_items, set_key_items] = useState([]);  // Содержимое списка ключей
    const [first_key_list_item, set_first_key_list_item] = useState(null);  // Первый элемент списка ключей, он появится после добавления нового ключа
    const [is_load_key_manager, set_load_key_manager] = useState(false);
    const [key_manager_error_code, set_key_manager_er_code] = useState(null);
    const [is_banned_current_key, set_ban_current_key] = useState(false);  // Текущий активный ключ
    const [total_key_counter, change_total_key_counter] = useState(0);  // Счётчик для краткой сводки
    const [local_key_counter, change_local_key_counter] = useState(0);  // Счётчик для краткой сводки
    const [undefined_key_counter, change_undefined_key_counter] = useState(0);  // Счётчик для краткой сводки
    const [banned_key_counter, change_banned_key_counter] = useState(0);  // Счётчик для краткой сводки
    const [available_keys_counter, change_available_keys_counter] = useState(0);  // Счётчик максимально допустимого кол-ва ключей, приходит с бэкенда
    const [unused_keys_counter, change_unused_keys_counter] = useState(0);  // Счётчик для краткой сводки
    const [is_show_crete_key_block, set_show_crete_key_block] = useState(false);  // Генерация нового ключа и кнопка копирования
    const [is_show_add_options_key_block, set_show_add_key_options] = useState(false); // Показ кнопок - вариант добавления ключа
    const [is_show_add_key_block, set_show_add_key_block] = useState(false);
    const [new_key, set_new_key] = useState("");  // Содержимое инпута генерирования ключа (используем именно useState, чтобы рендерить эффект заполнения поверх звёздочек)
    const [is_active_send_new_key, set_active_send_new_key] = useState(false);  // Отправка end от нового ключа на сервер
    const is_disabled_apply_key_button = useRef(true);
    const [key_was_copy, copy_key] = useState(false);
    const key_input_carret_pos = useRef({start: 0, end: 0});
    const [key_placeholder, set_key_placeholder] = useState('********-****-4***-****-************');
    const keys_list_ref = useRef();
    // dialog options (настройки диалога)
    const dialog_options_visible = useRef(false);
    const is_superchat = useRef(false);

    // Верхняя панель настроек
    const help_block_animation_move = useRef(new Animated.Value(-50 - StatusBar.currentHeight)).current;  // Используем useRef, чтобы значение сохранялось между рендерами
    const help_block_button_animation = useRef(new Animated.Value(0.3)).current;
    const is_open_top_panel = useRef(false);
    const AnimatedPressable = Animated.createAnimatedComponent(Pressable);  // Создаем анимированный компонент
    let show_subscription = null;
    let hide_subscription = null;
    let fade_send_block = null;
    let show_send_block = null;

    const remove_from_key_items = async(nodes, tail) => {
        let all_key_items = nodes.filter((item, i, arr) => {
            return item["end"] != tail;
        });
        set_key_items(all_key_items);
    };
    
    const remove_from_header_key_item = async(tail) => {
        if (first_key_list_item == null) {
            return
        }
        if (first_key_list_item["end"] == tail) {
            set_first_key_list_item(null);
        }
    };

    const find_node = (nodes, node_data_key, node_data_value) => {
        /** Найти ноду в node_items, по node_data_key и node_data_value,
         * если они совпадут с данными внутри ноды.
         */
        for (let n = 0; n < nodes.length; n++) {
            let node = nodes[n];
            if (Object.hasOwn(node, node_data_key)) {
                if (node[node_data_key] == node_data_value) {
                    return node;
                }
            }
        }
        return null;
    };

    const search_first_separator = async(nodes) => {
        /**
         * Найти ноду с первым попавшимся sep в ноде
         */
        return nodes.find(node => Object.hasOwn(node, "sep")) || null;
    };

    const move_key_item_on_top = async(nodes, node, separator=null) => {
        /**
         * Вывести ноду на самый верх.
         * Найти ноду с переданным tail, проверить хук use state c list header component,
         * если list header component установлен, то хранящуюся там ноду добавляем к key_items списку,
         * а новую ставим в list header component.
         * Если хук, указывающий на list header component содержит null, 
         * то добавляем туда текущую ноду и удаляем её из key_items списка
         * separator - d["sep"] - строка - заголовок, добавляемый перед нодой
         */
        node["sep"] = separator;
        remove_from_key_items(nodes, node["end"]);
        if (first_key_list_item == null) {
            set_first_key_list_item(node);
            return 
        }
        if (first_key_list_item["end"] == node["end"]) {
            set_first_key_list_item(node);
            if (nodes.length && nodes[0]["sep"] == separator) {
                delete nodes[0]["sep"];
                set_key_items(nodes);
            }
            return
        }
        let current_node = first_key_list_item;
        current_node["is_current_key"] = false;
        let next_node_sep = await search_first_separator(nodes);
        if (next_node_sep != null) {
            current_node["sep"] = next_node_sep["sep"];
            delete next_node_sep["sep"];

        }
        if (separator == current_node["sep"]) {
            delete current_node["sep"];
        }
        set_key_items([...[current_node], ...nodes]);
        set_first_key_list_item(node);
    };

    add_and_check_exists_key = async(change_key_status, key_tail, full_key=null) => {  // Вставка уже созданного ключа, с предварительной проверкой его существования на сервере
        set_active_send_new_key(true);;
        let request;
        let auth_key = await get_auth_token();
        let header = {"Accept": "application/json", "Content-Type": "application/json"};
        if (auth_key != null) {
            header["Authorization"] = "Token " + auth_key;
        }
        try {
            request = await fetch(host + "/msg/key/check/", {
                method: "POST",
                headers: header,
                body: JSON.stringify({"tail": JSON.stringify([key_tail])}),
                signal: AbortSignal.timeout(3000),
            });
        } catch (_) {
            set_active_send_new_key(false);
            return
        }
        if (!request.ok) {
            if (request.status == "401") {
                router.replace("/login");
                return
            }
            set_active_send_new_key(false);
            return
        }
        let j;
        try {
            j = await request.json();
        } catch (t) {
            set_active_send_new_key(false);
            return
        }
        set_show_add_key_block(false);
        if (!(Array.isArray(j)) || j.length > 1) {
            set_active_send_new_key(false);
            return
        }
        if (!["is_banned", "expire", "end", "creator", 
            "creator_username", "create_date"].every(item => Object.keys(j[0]).includes(item))) {
            set_active_send_new_key(false);
            return
        }
        if (j.length == 0) { // Ключ ненайден на сервере, удалить его из списка
            remove_from_header_key_item(key_tail);
            remove_from_key_items(key_items, key_tail);
            set_active_send_new_key(false);
            return
        }
        j = j[0];
        if (change_key_status == "set_active") { // Ключ уже должен быть добавлен, нужно только отметить его действующим
            let all_key_items = key_items;
            for (let i = 0; i < all_key_items.length; i++) {
                all_key_items[i]["is_current_key"] = false;
            }
            let total_keys_from_current_dialog = await get_keys(dialog_id);
            let full_key_from_storage = total_keys_from_current_dialog[j["end"]] || null;
            if (full_key_from_storage == null) {
                await add_key(dialog_id, full_key);
            }
            full_key = full_key_from_storage || full_key;
            if (full_key == null) {
                j["key_undefined"] = true;
            }
            j["is_current_key"] = true;
            set_current_active_key(dialog_id, key_tail, full_key);
            current_key.current = key_tail;
            move_key_item_on_top(all_key_items, j, "Текущий");
        }
        if (change_key_status == "add_new") {  // Только что добавили из инпута
            add_key(dialog_id, full_key);
            move_key_item_on_top(key_items, j, "Новый");
        }
        if (change_key_status == "set_inactive") {
            remove_current_active_key(dialog_id);
            delete j["is_current_key"];
            let node_with_sep = await search_first_separator(key_items);
            move_key_item_on_top(key_items, j, node_with_sep == null ? "" : node_with_sep["sep"]);
        }
        set_active_send_new_key(false);
        keys_list_ref.current.scrollToIndex({
            animated: true,
            index: 0,
            viewOffset: 75
        });
    };

    const update_items_data = async(local, internal, active_key, used_items_category=true) => {  // Модификация словаря с данными под парсинг keyitem
        const create_date_sep = async(first_msg_time_str, last_msg_time_str, is_current_key=null) => {
            let first_msg_t = new Date(first_msg_time_str);
            let last_msg_t = new Date(last_msg_time_str);
            let left_date = first_msg_t.getUTCFullYear() + "." + first_msg_t.getUTCMonth() + 1 + "." + first_msg_t.getUTCDate();
            let right_date;
            if (!is_current_key) {
                right_date = last_msg_t.getUTCFullYear() + "." + last_msg_t.getUTCMonth() + 1 + "." + last_msg_t.getUTCDate();
            } else {
                right_date = "Текущий момент";
            }
            return left_date == right_date ? left_date : left_date + " - " + right_date;
        };
        let time = new Date();
        for (var i = 0; i < internal.length; i++) {
            let data = internal[i];
            data["key_undefined"] = false;
            if (!(Object.keys(local).includes(data["end"]))) {
                data["key_undefined"] = true;
            }
            data["is_current_key"] = false;
            if (active_key == data["end"]) {
                data["is_current_key"] = true;
                current_key.current = current_key;
                if (data["expire"] != null) {
                    if (time > data["expire"]) {
                        set_ban_current_key(true);
                    }
                }
            }
            if (data["is_banned"] && data["is_current_key"]) {
                set_ban_current_key(true);
            }
            if (used_items_category) {
                data["sep"] = await create_date_sep(data["first_message_time"], data["last_message_time"], current_key.current);
            }
        }
    };

    const update_keys_stat = async(local_items_dict, items_type_1, items_type_2) => {  // Добавление общей сводки по ключам
        let undefined_key_counter = 0;
        let banned_key_counter = 0;
        let time = new Date();
        let items = [...items_type_1, ...items_type_2];
        for (var i = 0; i < items.length; i++) {
            let data = items[i];
            if (!data["end"] in Object.keys(local_items_dict)) {
                undefined_key_counter++;
            }
            if (data["is_banned"]) {
                banned_key_counter++;
            } else {
                if (data["expire"] != null) {
                    if (time > data["expire"]) {
                        banned_key_counter++;
                    }
                }
            }
        }
        change_total_key_counter(items_type_1.length + items_type_2.length);
        change_local_key_counter(Object.keys(local_items_dict).length);
        change_undefined_key_counter(undefined_key_counter);
        change_banned_key_counter(banned_key_counter);
    };

    const toggle_help_block = () => {
        let b = StatusBar.currentHeight;
        Animated.timing(help_block_animation_move, {
          toValue: is_open_top_panel.current ? -50 - b : 50 + b,
          duration: 100,
          useNativeDriver: true,
        }).start();
        Animated.timing(help_block_button_animation, {
            toValue: is_open_top_panel.current ? 0.3 : 1,
            duration: 1000,
            useNativeDriver: true,
        }).start();
        is_open_top_panel.current = !is_open_top_panel.current;
    };

    const show_key_manager = async() => {
        set_load_key_manager(true);
        keys_window_visible.current = true;
        let interval;
        let internal_data = await load_keys_from_current_dialog();
        let used_keys = Object.hasOwn(internal_data, "used_keys") ? internal_data["used_keys"] : [];
        let unused_keys = Object.hasOwn(internal_data, "my_unused_keys") ? internal_data["my_unused_keys"] : [];
        let local_data = await get_keys(dialog_id);
        let active_key = get_current_key_tail(dialog_id);
        if (internal_data == false) {
            interval = setInterval(async() => {
                internal_data = await load_keys_from_current_dialog();
                if (internal_data != false) {
                    let used_keys = internal_data["used_keys"] || [];
                    let unused_keys = internal_data["my_unused_keys"] || [];
                    update_items_data(local_data, used_keys, active_key, true);
                    update_items_data(local_data, unused_keys, active_key, false);
                    if (unused_keys.length > 0) {
                        unused_keys[0]["sep"] = "Ранее не использовались";
                    }
                    let total_keys = [...used_keys, ...unused_keys];
                    set_key_items(total_keys);
                    let active_node = find_node(total_keys, "is_current_key", true);  // Попытаемся дополнительно сортировать ключи - вынести текущий ключ первым в списке
                    if (active_node != null) {
                        move_key_item_on_top(total_keys, active_node, "Текущий");
                    } else {
                        let unfill_node = find_node(total_keys, "key_undefined", true);  // Попытаемся дополнительно сортировать ключи - вынести не заполненный ключ первым в списке
                        unfill_node == null ? null : move_key_item_on_top(total_keys, unfill_node, "Новый");
                    }
                    update_keys_stat(local_data, used_keys, unused_keys);
                    change_available_keys_counter(internal_data["max_keys_count_on_dialog"]);
                    change_unused_keys_counter(unused_keys.length);
                    is_superchat.current = internal_data["is_superchat"];
                    set_load_key_manager(false);
                    clearInterval(interval);
                }
            }, 5000);
            return
        }
        update_items_data(local_data, used_keys, active_key, true);
        update_items_data(local_data, unused_keys, active_key, false);
        if (unused_keys.length > 0) {
            unused_keys[0]["sep"] = "Ранее не использовались";
        }
        let total_keys = [...used_keys, ...unused_keys];
        set_key_items(total_keys);
        let active_node = find_node(total_keys, "is_current_key", true);  // Попытаемся дополнительно сортировать ключи - вынести текущий ключ первым в списке
        if (active_node != null) {
            move_key_item_on_top(total_keys, active_node, "Текущий");
        }
        update_keys_stat(local_data, used_keys, unused_keys);
        change_available_keys_counter(internal_data["max_keys_count_on_dialog"]);
        change_unused_keys_counter(unused_keys.length);
        is_superchat.current = internal_data["is_superchat"];
        set_load_key_manager(false);
    };

    const get_key_from_buffer = async() => {
        let key = await Clipboard.getStringAsync();
        set_show_add_key_block(true);
        set_show_add_key_options(false);
        if (is_valid_key_and_tail(key.slice(-7), key)) {
            set_new_key(key);
            is_disabled_apply_key_button.current = false;
        } else {
            is_disabled_apply_key_button.current = true;
        }
    };

    const hide_key_manager = async() => {
        keys_window_visible.current = false;
        set_key_items([]);
        set_load_key_manager(false);
        set_key_manager_er_code(null);
        set_show_crete_key_block(false);
        set_new_key("");  // Содержимое инпута генерирования ключа
        is_disabled_apply_key_button.current = true;
        set_show_add_key_block(false);
        set_show_add_key_options(false);
        copy_key(false);
        set_key_placeholder('********-****-4***-****-************');
        set_first_key_list_item(null);
        toggle_help_block();
    };

    const get_text_over_placeholder_text = (placeholder_text, text) => {  // Получить строку, поверх базовой строки (заполнение инпута поверх подсказки)
        let i = text.indexOf("*");
        let cleaned_text = text;
        if (i != -1) {
            cleaned_text = text.slice(0, i);
            for (let t = i; t < placeholder_text.length; t++) {
                if (placeholder_text[t] != "*") {
                    cleaned_text = cleaned_text + placeholder_text[t];
                    i = i + 1;
                } else {
                    break
                }
            }
            if (cleaned_text.length == placeholder_text.length) {
                key_input_carret_pos.current = {start: cleaned_text.length, end: cleaned_text.length};
                return cleaned_text;
            }
        } else {
            i = cleaned_text.length;
        }
        let pl = placeholder_text.slice(i, placeholder_text.length);
        key_input_carret_pos.current = {start: i, end: i};
        return cleaned_text + pl;
    };

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

    const load_keys_from_current_dialog = async() => {
        if (is_load_key_manager) {
            return {};
        }
        let token = await get_auth_token();
        let header = {"Accept": "application/json", "Content-Type": "application/json"};
        if (token) {
            header["Authorization"] = "Token " + token;
        } else {
            router.replace("/login");
            return {}
        }
        let loader;
        try {
            loader = await fetch(host + "/msg/dialog/" + dialog_id + "/details/", {
                headers: header,
                signal: AbortSignal.timeout(5000),
            });
        } catch (error) {
            return false;
        }
        if (!loader.ok) {
            set_key_manager_er_code(loader.status);
            return {}
        }
        let data;
        try {
            data = await loader.json();
        } catch (e_msg) {
            set_key_manager_er_code("json loads");
            return {}
        }
        if (!Object.hasOwn(data, "is_superchat") || !Object.hasOwn(data, "used_keys") || !Object.hasOwn(data, "my_unused_keys") ||
            !Object.hasOwn(data, "max_keys_count_on_dialog")) {
            set_key_manager_er_code("invalid json data");
            return {}
        }
        let used_keys_list = ["end", "count_messages", "first_message_time", "last_message_time",
                              "creator", "is_banned", "expire", "create_date", "creator_username"];
        let unused_keys_list = ["end", "create_date", "creator_username", "creator", "is_banned", "expire"];
        if (!data["used_keys"].every(obj => Object.keys(obj).every(key => used_keys_list.includes(key)))) {
            set_key_manager_er_code("invalid json data");
            return {}
        }
        if (!data["my_unused_keys"].every(obj => Object.keys(obj).every(key => unused_keys_list.includes(key)))) {
            set_key_manager_er_code("invalid json data");
            return {}
        }
        return data;
    };

    const create_and_send_new_key = async(key) => { // Генерация нового ключа, возможность им поделиться, и создание записи на сервере
        if (!is_valid_key_and_tail(key)) {
            return
        }
        set_active_send_new_key(true);
        let request;
        let token = await get_auth_token();
        let h = {"Accept": "application/json", "Content-Type": "application/json"};
        token ? h["Authorization"] = "Token " + token : null;
        try {
            request = await fetch(host + "/msg/key/add/", {
                method: "POST",
                headers: h,
                body: JSON.stringify({"end": key, "d": dialog_id}),
                signal: AbortSignal.timeout(5000)
            });
            if (!request.ok) {
                if (request.status == 401) {
                    router.replace("/login");
                    return
                }
                set_active_send_new_key(false);
                return
            }
        } catch (_) {
            set_active_send_new_key(false);
            return
        }
        let d;
        try {
            d = await request.json();
        } catch (_) {
            set_active_send_new_key(false);
            return
        }
        await add_key(dialog_id, new_key);
        set_current_active_key(dialog_id, key, new_key);
        set_ban_current_key(false);
        current_key.current = key;
        move_key_item_on_top(key_items, d, "Новый");
        set_active_send_new_key(false);
        set_show_crete_key_block(false);
        keys_list_ref.current.scrollToIndex({
            animated: true,
            index: 0,
            viewOffset: 75
        });
    };

    useEffect(() => {
        current_key.current = get_current_key_tail(dialog_id);
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
            fade_send_block = Keyboard.addListener('keyboardDidShow', (_) => {
                change_opacity(1);
            });
            show_send_block = Keyboard.addListener('keyboardDidHide', (_) => {
                change_opacity(0.1);
            });
            if (Platform.OS == "android") { // В ios клавитура сдвигает в ...<KeyboardAvoidingView behavior=..., для андроид пришлось писать этот костыль
                show_subscription = Keyboard.addListener('keyboardDidShow', (event) => {
                    set_keyboard_height(event.endCoordinates.height + 60);
                    set_last_msg_h(120 + event.endCoordinates.height);
                });
                hide_subscription = Keyboard.addListener('keyboardDidHide', (_) => {
                set_keyboard_height(60);
                set_last_msg_h(120);
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
            // key manager
            keys_window_visible.current = false;
            set_key_items([]);
            set_load_key_manager(false);
            set_key_manager_er_code(null);
            set_ban_current_key(false);  // Текущий активный ключ
            set_show_crete_key_block(false);
            set_new_key("");  // Содержимое инпута генерирования ключа
            is_disabled_apply_key_button.current = true;
            set_show_add_key_block(false);
            set_show_add_key_options(false);
            copy_key(false);
            set_key_placeholder('********-****-4***-****-************');
            set_first_key_list_item(null);
            current_key.current = null;
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
                <View style={styles.keys_container}>
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
                    <>
                    <Animated.View style={[styles.settings, {transform: [{translateY: help_block_animation_move}] } ]}>
                        <TouchableOpacity onPress={() => router.back()}>
                            <Image source={require("../assets/back.png")} style={styles.help_line_img} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={show_key_manager}>
                            <Image source={require("../assets/key_icon_vertical_150.png")} style={styles.help_line_img} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={show_key_manager}>
                            <Image source={require("../assets/dialog-settings.png")} style={styles.help_line_img} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={show_key_manager}>
                            <Image source={require("../assets/group_chat_icon_128x128.png")} style={styles.help_line_img} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={show_key_manager}>
                            <Image source={require("../assets/profile-96.png")} style={styles.help_line_img} />
                        </TouchableOpacity>
                    </Animated.View>
                    <AnimatedPressable style={[styles.toggle_settings_button, {transform: [{translateY: Animated.add(help_block_animation_move, 60)}]},
                        {opacity: help_block_button_animation} ]} onPress={toggle_help_block}>
                        <Image source={require("../assets/free-icon-plus-button-10233527.png")} style={styles.plus} />
                    </AnimatedPressable>
                    <Modal visible={keys_window_visible.current} animationType="fade" transparent={true}>
                        {is_load_key_manager ? (
                            <ActivityIndicator />
                        ) : (
                            key_manager_error_code != null ? (
                                <View style={styles.keys_container}>
                                    <Text>Произошла ошибка:</Text>
                                    <Text>{key_manager_error_code}</Text>
                                </View>
                            ) : (
                                <View style={styles.keys_container}>
                                    <Text style={styles.head_text}>Шифрование</Text>
                                    <Text>Всего ключей: {total_key_counter}/{available_keys_counter}</Text>
                                    <Text>На вашем устройстве: {local_key_counter}</Text>
                                    <Text>Не найдены: {undefined_key_counter}</Text>
                                    <Text>Заблокированы: {banned_key_counter}</Text>
                                    <Text>Сгенерированы, но не использовались ранее: {unused_keys_counter}</Text>
                                    {is_superchat && (current_key == null || is_banned_current_key) ? (
                                        <Text>Создайте или установите ключ, чтобы отправлять сообщения.</Text>
                                    ) : null}
                                    <View style={styles.keys_table_row}>
                                        <Text style={styles.keys_table_row_inner_text}>Ключ</Text>
                                        <Text style={styles.keys_table_row_inner_text}>Создатель</Text>
                                        <Text style={styles.keys_table_row_inner_text}>Дата создания</Text>
                                        <Text style={styles.keys_table_row_inner_text}>Статус</Text>
                                        <Text style={styles.keys_table_inner_last}>Действие</Text>
                                    </View>
                                    <FlatList data={key_items}
                                        renderItem={({item}) => <KeyListItem item={item} set_show_add_key={set_show_add_key_block}
                                        set_placeholder={set_key_placeholder} />}
                                        ListHeaderComponent={() => {
                                            if (first_key_list_item == null) return null;
                                            return (
                                                <KeyListItem 
                                                    item={first_key_list_item} 
                                                    set_show_add_key={set_show_add_key_block}
                                                    set_placeholder={set_key_placeholder} 
                                                />
                                            );
                                        }} ref={keys_list_ref} />
                                    <View>
                                        {is_show_crete_key_block ? (
                                            <>
                                                <View style={styles.new_key_input_block}>
                                                    <TextInput readOnly={true} editable={false} multiline={false}
                                                        autoCorrect={false} autoFocus={false} caretHidden={true} value={new_key} style={styles.key_input} />
                                                    <TouchableOpacity onPress={async() => {
                                                                                  await Clipboard.setStringAsync(new_key);
                                                                                  copy_key(true);
                                                                              }}>
                                                        {key_was_copy ? (
                                                            <Image source={require("../assets/icons8-apply-48.png")} />
                                                        ) : (
                                                            <Image source={require("../assets/icons8-copy-48.png")} />
                                                        )}
                                                    </TouchableOpacity>
                                                </View>
                                                <Text style={styles.small_text}>Скопируйте и отправьте новый ключ участникам чата любым удобным и безопасным способом.</Text>
                                                <View style={styles.keys_window_bottom_block}>
                                                    {is_active_send_new_key ? <ActivityIndicator /> : null}
                                                    {current_key != new_key ? (
                                                        <Button title="Установить" onPress={() => {
                                                            create_and_send_new_key(new_key.slice(-7));
                                                        }} />
                                                    ) : null}
                                                </View>
                                            </>
                                        ) : null}
                                        {is_show_add_key_block ? (
                                            <View style={styles.new_key_input_block}>
                                                <TextInput multiline={false} autoCorrect={false} autoFocus={() => {
                                                        is_valid_key_and_tail(new_key.slice(-7), new_key) ? false : true
                                                    }} value={new_key} style={styles.key_input}
                                                    onChangeText={(t) => {
                                                        let text = get_text_over_placeholder_text(key_placeholder, t);
                                                        const is_valid = is_valid_key_and_tail(text.slice(-7), text);
                                                        is_disabled_apply_key_button.current = !is_valid;
                                                        set_new_key(text);
                                                     }} autoCapitalize={false} 
                                                     selection={key_input_carret_pos.current} 
                                                     placeholder={key_placeholder} />
                                                {is_active_send_new_key ? <ActivityIndicator /> : null}
                                                <Button title="Ok" disabled={is_disabled_apply_key_button.current} onPress={async() => {
                                                    let t = new_key.slice(-7);
                                                    add_and_check_exists_key("add_new", t, new_key);
                                                    }} />
                                            </View>
                                        ) : null}
                                        {is_show_add_options_key_block ? (
                                            <View style={styles.keys_window_bottom_block}>
                                                <Button title="Вставить" onPress={get_key_from_buffer} />
                                                <Button title="Сгенерировать" onPress={async() => {
                                                    set_new_key(await generate_key());
                                                    set_show_add_key_options(false);
                                                    set_show_crete_key_block(true);
                                                }} />
                                            </View>
                                        ) : null}
                                    </View>
                                    <View style={styles.keys_window_bottom_block}>
                                        {!is_show_add_key_block && !is_show_crete_key_block ? (
                                            <Button title="Новый ключ" style={styles.keys_window_buttons} onPress={() => {set_show_add_key_options(true)}} />
                                        ) : null}
                                        <Button title="Закрыть" onPress={hide_key_manager} style={styles.keys_window_buttons} />
                                    </View>
                                </View>
                            )
                        )}
                    </Modal>

                    <SafeAreaProvider style={styles.main}>
                        <SafeAreaView style={styles.safe_area} edges={['left', 'right']}>
                            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
                                style={styles.list_body}>
                                <FlatList data={messages} onEndReached={load_messages}
                                    ListFooterComponent={is_loading ? <ActivityIndicator /> : null}
                                    ListHeaderComponent={<View style={{height: last_message_height}} />}
                                    renderItem={({item, index}) => {
                                        const next = index < messages.length - 1 ? messages[index + 1] : null;
                                        return <Message item={item} next_item={next} />
                                        }
                                    } onEndReachedThreshold={0.1} inverted={true} />
                            </KeyboardAvoidingView>
                            <View style={[styles.actions, {bottom: keyboard_h, opacity: get_opacity == 1 ? 1 : 0.1}]}
                                collapsable={false} // для андроид. запрещает перерисовывать при изменении opacity, что предотвращает повторное срабатывание
                                >
                                <TextInput style={styles.msg_input} multiline={true} onChangeText={change_draft} value={draft} />
                                <TouchableOpacity onPress={send} disabled={draft == "" ? true : false} >
                                    <Image source={require("../assets/image_c38b924.jpg")} style={styles.send_img} />
                                </TouchableOpacity>
                            </View>
                        </SafeAreaView>
                    </SafeAreaProvider>
                    </>
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
    keys_container: {
        flex: 1,
        backgroundColor: "rgba(255, 255, 255, 0.8)",
        height: 300,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 10,
    },
    keys_window_bottom_block: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-end",
    },
    head_text: {
        fontSize: 18,
        marginBottom: 20,
    },
    keys_window_buttons: {
        alignContent: "space-between",
    },
    message_item_left: {
        flexDirection: "column",
        justifyContent: 'flex-start',
        alignSelf: 'flex-start', // Прижимает блок к ЛЕВОМУ краю
        minWidth: 150,
        marginTop: 15,
        marginLeft: 10,
    },
    author_left: {
        alignSelf: 'flex-start',
        marginBottom: 20,
    },
    message_item_right: {
        flexDirection: "column",
        justifyContent: 'flex-start',
        alignSelf: 'flex-end', // Прижимает блок к ПРАВОМУ краю
        minWidth: 150,
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
        width: 200,
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
        marginHorizontal: 10,
    },
    help_line_img: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginTop: StatusBar.currentHeight,
    },
    plus: {
        width: 50,
        height: 50,
        marginHorizontal: 10,
    },
    settings: {
        flexDirection: "row",
        justifyContent: "space-evenly",
        position: "absolute",
        width: "100%",
        zIndex: 10,
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: "#DDD",
        height: 50 + StatusBar.currentHeight,
    },
    toggle_settings_button: {
        width: 50,
        height: 50,
        position: "absolute",
        alignSelf: "center",
        opacity: 0.2,
        zIndex: 10,
        marginRight: 20,
        marginTop: 30,
    },
    keys_table_row: {
        alignItems: "stretch",
        justifyContent: "stretch",
        flexDirection: "row",
    },
    keys_table_row_inner_text: {
        paddingVertical: 10,
        paddingHorizontal: 5,
        borderWidth: 1,
        borderRightWidth: 0,
        borderStyle: "solid",
        maxWidth: "20%",
    },
    keys_table_inner_last: {
        borderWidth: 1,
        paddingVertical: 10,
        paddingHorizontal: 5,
        borderStyle: "solid",
    },
    new_key_input_block: {
        flexDirection: "row",
        justifyContent: "space-between",
    },
    key_input: {
        width: 280,
        borderWidth: 2,
        borderStyle: "dashed",
        borderColor: '#20232a',
        backgroundColor: '#61dafb',
        color: '#20232a',
        borderRadius: 2,
    },
    small_text: {
        fontSize: 9,
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
    msg_bottom: {
        flexDirection: "row", 
        justifyContent: "space-between", 
    },
    msg_bottom_text: {
        fontSize: 9, 
    },
});
