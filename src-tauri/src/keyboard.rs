// Keyboard automation using Windows SendInput API with Hardware Scan Codes
#[cfg(windows)]
pub mod win_impl {
    use std::mem::size_of;
    use std::thread::sleep;
    use std::time::Duration;
    use windows_sys::Win32::UI::Input::KeyboardAndMouse::{
        GetAsyncKeyState, MapVirtualKeyW, SendInput, INPUT, INPUT_0, INPUT_KEYBOARD, KEYBDINPUT,
        KEYEVENTF_KEYUP, MAPVK_VK_TO_VSC, VK_ESCAPE, VK_F6, VK_SHIFT,
    };

    #[derive(Debug, Clone, Copy)]
    pub struct KeyTarget {
        pub vk: u16,
        pub scan: u16,
        pub shift: bool,
    }

    pub fn char_to_key_target(c: char) -> Option<KeyTarget> {
        let (vk, shift) = match c {
            'a'..='z' => (0x41 + (c as u16 - 'a' as u16), false),
            'A'..='Z' => (0x41 + (c as u16 - 'A' as u16), true),
            '0'..='9' => (0x30 + (c as u16 - '0' as u16), false),
            '!' => (0x31, true), // 1
            '@' => (0x32, true), // 2
            '#' => (0x33, true), // 3
            '$' => (0x34, true), // 4
            '%' => (0x35, true), // 5
            '^' => (0x36, true), // 6
            '&' => (0x37, true), // 7
            '*' => (0x38, true), // 8
            '(' => (0x39, true), // 9
            ')' => (0x30, true), // 0
            _ => return None,
        };

        let scan = unsafe { MapVirtualKeyW(vk as u32, MAPVK_VK_TO_VSC) as u16 };

        Some(KeyTarget { vk, scan, shift })
    }

    fn make_key_input(vk: u16, scan: u16, key_up: bool) -> INPUT {
        let mut flags = 0;
        if key_up {
            flags |= KEYEVENTF_KEYUP;
        }

        INPUT {
            r#type: INPUT_KEYBOARD,
            Anonymous: INPUT_0 {
                ki: KEYBDINPUT {
                    wVk: vk,
                    wScan: scan,
                    dwFlags: flags,
                    time: 0,
                    dwExtraInfo: 0,
                },
            },
        }
    }

    pub fn send_inputs(inputs: &[INPUT]) {
        if inputs.is_empty() {
            return;
        }
        unsafe {
            SendInput(
                inputs.len() as u32,
                inputs.as_ptr(),
                size_of::<INPUT>() as i32,
            );
        }
    }

    pub fn press_single_key(target: KeyTarget, hold_ms: u64) {
        let shift_scan = unsafe { MapVirtualKeyW(VK_SHIFT as u32, MAPVK_VK_TO_VSC) as u16 };
        let mut down_inputs = Vec::new();
        let mut up_inputs = Vec::new();

        if target.shift {
            down_inputs.push(make_key_input(VK_SHIFT, shift_scan, false));
            up_inputs.push(make_key_input(VK_SHIFT, shift_scan, true));
        }

        down_inputs.push(make_key_input(target.vk, target.scan, false));
        up_inputs.insert(0, make_key_input(target.vk, target.scan, true));

        send_inputs(&down_inputs);
        // Hold key down for sufficient duration (30-40ms) so Chrome web audio & games register reliably
        sleep(Duration::from_millis(hold_ms.clamp(25, 60)));
        send_inputs(&up_inputs);
    }

    pub fn press_chord(targets: &[KeyTarget], hold_ms: u64) {
        if targets.is_empty() {
            return;
        }

        let shift_scan = unsafe { MapVirtualKeyW(VK_SHIFT as u32, MAPVK_VK_TO_VSC) as u16 };
        let needs_shift = targets.iter().any(|t| t.shift);
        let mut down_inputs = Vec::new();
        let mut up_inputs = Vec::new();

        if needs_shift {
            down_inputs.push(make_key_input(VK_SHIFT, shift_scan, false));
        }

        for t in targets {
            down_inputs.push(make_key_input(t.vk, t.scan, false));
            up_inputs.push(make_key_input(t.vk, t.scan, true));
        }

        if needs_shift {
            up_inputs.push(make_key_input(VK_SHIFT, shift_scan, true));
        }

        send_inputs(&down_inputs);
        sleep(Duration::from_millis(hold_ms.clamp(30, 70)));
        send_inputs(&up_inputs);
    }

    pub fn is_f6_pressed() -> bool {
        unsafe { (GetAsyncKeyState(VK_F6 as i32) as u16 & 0x8000) != 0 }
    }

    pub fn is_esc_pressed() -> bool {
        unsafe { (GetAsyncKeyState(VK_ESCAPE as i32) as u16 & 0x8000) != 0 }
    }
}
