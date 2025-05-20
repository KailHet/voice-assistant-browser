let speech = new SpeechSynthesisUtterance();

speech.lang = "ru";
let voices = []; // глобальный массив доступных голосов 

document.getElementById('tts').addEventListener('change', () => {
    const tts = document.getElementById('tts')

    const tts_settings = document.getElementById('tts-settings')
    if (tts.checked) {
        tts_settings.style.display = 'block'

    } else  tts_settings.style.display = 'none'
    
})

window.speechSynthesis.onvoiceschanged = () => {
    // Получение списка голосов 
    voices = window.speechSynthesis.getVoices();

    // Первоначальная установка первого голоса в массиве
    speech.voice = voices[0];

    // Установка списка выбора голосов (задаем индекс в качестве значения, который в дальнейшем потребуется при обновлении пользователем голоса посредством меню Select) 
    let voiceSelect = document.querySelector("#voices");
    voices.forEach((voice, i) => (voiceSelect.options[i] = new Option(voice.name, i)));
};

document.querySelector("#rate").addEventListener("input", () => {
    // Получение значения rate из input
    const rate = document.querySelector("#rate").value;

    // Установка свойства rate экземпляра SpeechSynthesisUtterance 
    speech.rate = rate;

    // Обновление метки rate 
    document.querySelector("#rate-label").innerHTML = rate;
});

document.querySelector("#pitch").addEventListener("input", () => {
    // Получение значения pitch из input
    const pitch = document.querySelector("#pitch").value;

    // Установка свойства pitch экземпляра SpeechSynthesisUtterance 
    speech.pitch = pitch;

    // Обновление метки pitch 
    document.querySelector("#pitch-label").innerHTML = pitch;
});

document.querySelector("#voices").addEventListener("change", () => {
    // При изменении голоса используется значение меню выбора (которое является индексом голоса в глобальном массиве голосов)
    speech.voice = voices[document.querySelector("#voices").value];
});

document.querySelector("#volume").addEventListener("input", () => {
    // Получение значения volume из input
    const volume = document.querySelector("#volume").value;

    // Установка свойства volume экземпляра SpeechSynthesisUtterance 
    speech.volume = volume;

    // Обновление метки volume
    document.querySelector("#volume-label").innerHTML = volume;
});

var webaudio_tooling_obj = async function () {

    var audioContext = new AudioContext();
    console.log("audio is starting up ...");

    var BUFF_SIZE = 16384;
    var audioInput = null,
        microphone_stream = null,
        gain_node = null,
        script_processor_node = null,
        script_processor_fft_node = null,
        analyserNode = null;

    if (!navigator.getUserMedia)
        navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia ||
                        navigator.mozGetUserMedia || navigator.msGetUserMedia;

    if (navigator.getUserMedia){
        navigator.getUserMedia({audio:true}, 
            function(stream) {
                start_microphone(stream);
            },
            function(e) {
                alert('Ошибка при получении аудио.');
            }
        );
    } else { 
        alert('Получение аудио недоступно в этом браузере. Для стабильной работы рекомендуется использовать Chrome или Edge. (getUserMedia not supported in this browser).'); 
    }

    function start_microphone(stream){
        gain_node = audioContext.createGain();
        gain_node.connect(audioContext.destination);

        microphone_stream = audioContext.createMediaStreamSource(stream);
        microphone_stream.connect(gain_node); 

        script_processor_node = audioContext.createScriptProcessor(BUFF_SIZE, 1, 1);
        script_processor_node.onaudioprocess = process_microphone_buffer;

        microphone_stream.connect(script_processor_node);

        // --- setup FFT
        script_processor_fft_node = audioContext.createScriptProcessor(2048, 1, 1);
        script_processor_fft_node.connect(gain_node);

        analyserNode = audioContext.createAnalyser();
        analyserNode.smoothingTimeConstant = 0;
        analyserNode.fftSize = 2048;

        microphone_stream.connect(analyserNode);

        analyserNode.connect(script_processor_fft_node);

        script_processor_fft_node.onaudioprocess = function() {
            var array = new Uint8Array(analyserNode.frequencyBinCount);
            analyserNode.getByteFrequencyData(array);
            // Здесь можно добавить код для обработки FFT, если это необходимо
        };
    }

    function process_microphone_buffer(event) { 
        // Этот код можно использовать для дополнительной обработки аудио, если это необходимо
    }

    return {
        start: function() {
            // Инициализация уже выполнена в конструкторе
        },
        getMicrophoneStream: function() {
            return microphone_stream;
        }
    };
}();

// Инициализация распознавателя речи
window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition || null;

if (window.SpeechRecognition === null) {
    const status = document.getElementById('status')
    status.innerText = "Ваш браузер не поддерживает распознавание речи. Для стабильной работы рекомендуется использовать Chrome или Edge.";
    // status.style.color = 'red'
    status.style.background = '#DA0038'
} else {
    var recognition = new window.SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = false; // возвращает промежуточный результат распознавания
    recognition.lang = 'ru-RU';

    recognition.onresult = function(event) {
        // var interim_transcript = '';
        var final_transcript = '';

        for (var i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                final_transcript += event.results[i][0].transcript;
                console.log("Final: " + final_transcript);
            } //else {
                // interim_transcript += event.results[i][0].transcript;
                // console.log("Interim: " + interim_transcript);
            // }
        }
        
        let currentWindow

        fetch('/data')
        .then(async response => {
            if (!response.ok) {
                throw new Error("Failed to get phrases from server");
            }
            return response.json();
        })
        .then(async data => {
            if (!data) {
                throw new Error("No data from server");
            }
            const json = JSON.parse(data)
            if (final_transcript.toLowerCase().includes(json.mainWord)) {

                document.getElementById('transcript').innerText = final_transcript;
                const answer = document.getElementById('answer')
                answer.innerText = '';

                for (let phrase of json.phrases) {
                    for (let i = 0; i < phrase.mainTrigger.length; i++) {
                        if (final_transcript.toLowerCase().includes(phrase.mainTrigger[i].toLowerCase())) {
                            
                            currentWindow = final_transcript.replace(json.mainWord, '').replace(phrase.mainTrigger, '') 
                            console.log(currentWindow)
                            
                            for (let j = 0; j < phrase.secondTrigger.length; j++) {

                                console.log(final_transcript.toLowerCase().replace(json.mainWord, '').replace(phrase.mainTrigger[i], '').replace(/[.,/?! ]/gi,''))
                                if (phrase.secondTrigger[j].toLowerCase() === final_transcript.toLowerCase().replace(json.mainWord, '').replace(phrase.mainTrigger[i], '').replace(/[.,/?! ]/gi,'')) {
                                    // if (phrase.action === 'url') {
                                    //     return window.open(`${phrase.data.toLowerCase()
                                    //         .replace('{phrase}',
                                    //             final_transcript
                                    //             .replace(json.mainWord, '')
                                    //             .replace(phrase.mainTrigger, '')
                                    //             // .replace(phrase.secondTrigger, '')
                                    //         )
                                    //     }`)
                                    // } else 
                                    if (phrase.action === 'app') {
                                        return fetch(`/openApp/${final_transcript.toLowerCase()
                                            .replace(json.mainWord, '')
                                            .replace(phrase.mainTrigger[i], '')
                                            .replace(/ /gi,'')
                                            // .replace(phrase.secondTrigger, '')
                                        }`)
                                    }
                                }
                            }
                        } 
                    }
                }
                console.log(final_transcript)
                fetch(`/talkToAI/${final_transcript}`)
                .then(async response => {
                    if (!response.ok) {
                        throw new Error("Failed to get phrases from server");
                    }
                    return response.json()
                })
                .then(async data => {
                    console.log(data)
                    // const json = JSON.parse(data)
                    let msg = data.choices[0].message.content
                    if (msg.startsWith('steam://') || msg.startsWith('https://') || msg.startsWith('http://')) {
                        window.open(msg.replace(/[` ]/gi,''))
                        msg = 'Выполняю'
                    }

                    answer.style.display = 'block'
                    answer.innerHTML = msg;

                    const tts = document.getElementById('tts')
                    if (tts.checked) {
                        speech.text = msg;
                        window.speechSynthesis.speak(speech)
                    }
                })
            }
        })
        .catch(e => {return console.error('Ошибка при чтении фраз:' + e)})

    };

    recognition.onerror = function(event) {
        console.error("Recognition error:", event.error);
    };

    recognition.onend = function() {
        // console.log("Recognition ended, restarting...");
        recognition.start();
    };

    recognition.start();
    document.getElementById('status').innerText = "Распознавание речи начато.";
}