import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const TAIL_LENGTH = 7;
const MAX_KEYS_COUNT = 200;


export const generate_key = async() => {
    return Crypto.randomUUID();
};


export const get_keys = async(dialog_id) => {
    let data;
    if (Platform.OS == "web") {
        data = localStorage.getItem("keys") || "{}";
    } else {
        data = await SecureStore.getItemAsync("keys") || "{}";    
    }
    data = JSON.parse(data);
    return Object.hasOwn(data, dialog_id) ?  data[dialog_id] : {};
};


export const get_current_key_tail = (dialog_id) => {
    if (!(typeof dialog_id == "string")) {
        throw Error("Ожидалась строка");
    }
    if (Platform.OS == "web") {
            return localStorage.getItem("current_" + dialog_id) || null;
        }
        return SecureStore.getItem("current_" + dialog_id) || null;
};


export const set_current_active_key = async(dialog_id, key_tail, key) => {
    if (!(typeof dialog_id == "string")) {
        throw Error("Ожидалась строка");
    }
    if (!is_valid_key_and_tail(key_tail, key)) {
        throw Error("Ключ или tail недействителен");
    }
    let total_keys_from_current_dialog = await get_keys(dialog_id);
    if (!(Object.keys(total_keys_from_current_dialog).length)) {
        throw Error("Нет ни одного ключа");
    }
    if (!(Object.hasOwn(total_keys_from_current_dialog, key_tail))) {
        throw Error("Ключ не найден");
    }
    if (Platform.OS == "web") {
        localStorage.setItem("current_" + dialog_id, key_tail);        
    } else {
        SecureStore.setItemAsync("current_" + dialog_id, key_tail);
    }
};


export const remove_current_active_key = async(dialog_id) => {
    if (!(typeof dialog_id == "string")) {
        throw Error("Ожидалась строка");
    }
    if (Platform.OS == "web") {
        localStorage.removeItem("current_" + dialog_id);        
    } else {
        SecureStore.deleteItemAsync("current_" + dialog_id);
    }
};


export const add_key = async(dialog, key) => {
    if (!(typeof dialog == "string")) {
        throw Error("Ожидалась строка");
    }
    let t = key.slice(-7);
    if (!is_valid_key_and_tail(t, key)) {
        throw Error("Ключ невалиден");
    }
    let data;
    if (Platform.OS == "web") {
        data = localStorage.getItem("keys") || "{}";
    } else {
        data = await SecureStore.getItemAsync("keys") || "{}";
    }
    data = JSON.parse(data);
    let dialog_data = Object.hasOwn(data, dialog) ? data[dialog] : {};
    if (Object.keys(dialog_data).length) {
        dialog_data[t] = key;
    } else {
        data[dialog] = {[t]: key}
    }
    if (Object.keys(dialog_data).length > MAX_KEYS_COUNT) {
        delete dialog_data[Object.keys(dialog_data)[0]];
    }
    if (Platform.OS == "web") {
        localStorage.setItem("keys", JSON.stringify(data))
        return
    }
    SecureStore.setItemAsync("keys", JSON.stringify(data));
};


export const is_valid_key_and_tail = (key_tail, full_key=null) => {
    if (full_key !== null) {
        if (typeof(full_key) !== "string") {
            return false;
        }
        if (full_key.search(/^[A-Za-z0-9]{8}-[A-Za-z0-9]{4}-4[A-Za-z0-9]{3}-[A-Za-z0-9]{4}-[A-Za-z0-9]{12}$/i) == -1) {
            return false;
        }
        if (full_key.slice(-TAIL_LENGTH) != key_tail) {
            return false;
        }
    }
    if (typeof(key_tail) !== "string") {
        return false;
    }
    if (key_tail.search(/^[A-Za-z0-9]{7}$/i) == -1) {
        return false;
    }
    return true;
};


export const encrypt_message_item = async(body, key, tail) => {
    if (!is_valid_key_and_tail(tail, key)) {
        throw Error("Ключ или его хвост невалидны");
    }
    // 1. Убираем дефисы из UUIDv4, получая валидную 32-символьную hex-строку (16 байт)
    const clean_key = key.replace(/-/g, '');
    // 2. Импортируем ключ как 128-битный AES-ключ
    const encryption_key = await Crypto.AESEncryptionKey.import(clean_key, 'hex');
    // 3. Кодируем текст сообщения в байты
    const plaintext_bytes = new TextEncoder().encode(body);
    // 4. Шифруем данные
    const sealed_data = await Crypto.aesEncryptAsync(plaintext_bytes, encryption_key);
    // 5. Возвращаем результат в base64
    const combined_bytes = await sealed_data.combined();
    return btoa(String.fromCharCode(...combined_bytes));
};


export const decrypt_message_item = async(encrypted, key, tail) => {
    if (!is_valid_key_and_tail(tail, key)) {
        throw Error("Ключ или его хвост невалидны");
    }
    // готовим ключ
    let ready_key = await Crypto.AESEncryptionKey.import(key.replace(/-/g, ""), "hex"); 
    // base64 в bytes
    const encoded_bytes = atob(encrypted);
    const arr_buffer = Uint8Array.from(encoded_bytes, char => char.charCodeAt(0));
    const sealed_data_obj = Crypto.AESSealedData.fromCombined(arr_buffer);
    // Расшифровываем сообщение по ключу
    const decode_msg_int_bytes = await Crypto.aesDecryptAsync(sealed_data_obj, ready_key);
    const decoded_msg_str = new TextDecoder().decode(decode_msg_int_bytes);
    return decoded_msg_str;
};
