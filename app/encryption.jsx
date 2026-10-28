import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const TAIL_LENGTH = 7;
const MAX_KEYS_COUNT = 200;


export const generate_key = async() => {
    return Crypto.randomUUID();
};


export const get_keys = async(dialog_id) => {
    if (Platform.OS == "web") {
        let data = await localStorage.getItem("keys") || {};
        return data[dialog_id] || {};
    }
    let data = await SecureStore.getItemAsync("keys") || {};
    return data[dialog_id] || {};
};


export const get_current_key_tail = async(dialog_id) => {
    if (Platform.OS == "web") {
            return await localStorage.getItem("current_" + dialog_id) || null;
        }
        return await SecureStore.getItemAsync("current_" + dialog_id) || null;
};


export const set_current_key_tail = async(dialog_id, key_tail, key) => {
    if (!is_valid_key_and_tail(tail, key)) {
        throw Error("Ключ или tail недействителен");
    }
    if (Platform.OS == "web") {
        let total_keys = await localStorage.getItem("keys") || {};
        let total_keys_from_current_dialog = {};
        if (dialog_id in total_keys) {
            total_keys_from_current_dialog = total_keys[dialog_id];
            total_keys_from_current_dialog[key_tail] = key;
            if (Object.keys(total_keys_from_current_dialog).length > MAX_KEYS_COUNT) {
                delete total_keys_from_current_dialog[Object.keys(total_keys_from_current_dialog)[0]];
            }
        } else {
            total_keys[dialog_id] = {key_tail: key};
        }
        localStorage.setItem("keys", total_keys);
        localStorage.setItem("current_" + dialog_id) || null;
        return
    }
    total_keys = await SecureStore.getItemAsync("keys") || {};
    let total_keys_from_current_dialog = {};
    if (dialog_id in total_keys) {
        total_keys_from_current_dialog = total_keys[dialog_id];
        total_keys_from_current_dialog[key_tail] = key;
        if (Object.keys(total_keys_from_current_dialog).length > MAX_KEYS_COUNT) {
            delete total_keys_from_current_dialog[Object.keys(total_keys_from_current_dialog)[0]];
        }
    } else {
        total_keys[dialog_id] = {key_tail: key};
    }
    SecureStore.setItemAsync("keys", total_keys);
    SecureStore.setItemAsync("current_" + dialog_id);
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
    if (!is_valid_key_and_tail(key_tail, key)) {
        throw Error("Ключ или его хвост невалидны");
    }
    return await lib.AES.encrypt(body, key);
};


export const decrypt_message_item = async(encrypted, key) => {
    if (!is_valid_key_and_tail(key_tail, key)) {
        throw Error("Ключ или его хвост невалидны");
    }
    return await lib.AES.decrypt(encrypted, key);
};
