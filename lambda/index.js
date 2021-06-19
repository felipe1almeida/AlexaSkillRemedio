/*
 * Copyright 2018-2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

// sets up dependencies
const Alexa = require('ask-sdk-core');
const i18n = require('i18next');
const moment = require('moment-timezone');
var persistenceAdapter = getPersistenceAdapter();
const languageStrings = require('./languageStrings');

//---------------------------------------------------------------------------------------------------------------------------------------------------------
//Iniciando a persistencia
function getPersistenceAdapter(tableName) {
    function isAlexaHosted() {
        return process.env.S3_PERSISTENCE_BUCKET;
    }
    if (isAlexaHosted()) {
        const { S3PersistenceAdapter } = require('ask-sdk-s3-persistence-adapter');
        return new S3PersistenceAdapter({
            bucketName: process.env.S3_PERSISTENCE_BUCKET
        });
    } else {
        const { DynamoDbPersistenceAdapter } = require('ask-sdk-dynamodb-persistence-adapter');
        return new DynamoDbPersistenceAdapter({
            tableName: tableName || 'remedios_registrados',
            createTable: true
        });
    }
}

//---------------------------------------------------------------------------------------------------------------------------------------------------------
//Inicia a alexa
const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    handle(handlerInput) {
        const { requestEnvelope, responseBuilder, attributesManager } = handlerInput;
        const { intent } = requestEnvelope.request;
        const sessionAttributes = attributesManager.getSessionAttributes(); //carregando os atributos de sessão
        const horasAtual = Date.now();
        var arrayRegistro = sessionAttributes['registro']; //carregando o array com todos os remedios cadastrados

        //apaga todos os tratamentos fora do periodo de tratamento
        for (var i = 0; i < arrayRegistro.length; i++) {

            var periodo = parseInt(arrayRegistro[i].periodo);
            var dataLimite = new Date(arrayRegistro[i].horas);
            var dia = dataLimite.getDate();
            dia = dia + periodo;
            dataLimite.setDate(dia);

            if (dataLimite < horasAtual) {
                arrayRegistro[i].tratamento = 1;
            }
        }

        if (arrayRegistro.length === 0) {
            arrayRegistro = [];
        }

        sessionAttributes['registro'] = arrayRegistro;
        var speakOutput = "Bem vindo, sou a Alexa e vou te auxiliar no seu tratamento."

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

//---------------------------------------------------------------------------------------------------------------------------------------------------------
//Código da intenção de registrar tratamento
const RegistrarRemediosIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'RegistrarRemediosIntent';
    },
    handle(handlerInput) {

        const { requestEnvelope, responseBuilder, attributesManager } = handlerInput;
        const { intent } = requestEnvelope.request;
        const sessionAttributes = attributesManager.getSessionAttributes(); //carregando os atributos de sessão
        var cadastrado = false;

        let speechText = "";

        var arrayRegistro = sessionAttributes['registro']; //carregando o array com todos os remedios cadastrados

        if (arrayRegistro.length === 0) {
            arrayRegistro = [];
        }

        if (intent.confirmationStatus === 'CONFIRMED') {

            //bloco de código que pega os slots monta um objeto e salva em um array, em seguida carrega como um atributo de sessão
            let remedio = Alexa.getSlotValue(requestEnvelope, 'remedio');
            let periodo = Alexa.getSlotValue(requestEnvelope, 'periodo');
            let hora = Alexa.getSlotValue(requestEnvelope, 'hora');
            const horas = Date.now();

            for (var i = 0; i < arrayRegistro.length; i++) {

                if (remedio === arrayRegistro[i].remedio && arrayRegistro[i].tratamento===0) {
                    cadastrado = true;
                }
            }

            if (cadastrado) {

                speechText = ('Este remédio já foi cadastrado'); // we'll save these values in the next module

            } else {

                var registro = new Object();
                registro.remedio = remedio;
                registro.periodo = periodo;
                registro.hora = hora;
                registro.horas = horas;
                registro.tratamento = 0;
                arrayRegistro.push(registro);
                sessionAttributes['registro'] = arrayRegistro;
                speechText = ('Cadastrado com sucesso, remédio ' + remedio + ' às ' + hora + 'horas, durante ' + periodo + ' dias.'); // we'll save these values in the next module

            }

        } else {
            const repromptText = handlerInput.t('HELP_MSG');
            responseBuilder.reprompt(repromptText);
        }

        return handlerInput.responseBuilder
            .speak(speechText)
            .getResponse();
    }
};

//---------------------------------------------------------------------------------------------------------------------------------------------------------
//apagar tratamentos
const ApagarTratamentoIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'ApagarTratamentoIntent';
    },
    handle(handlerInput) {

        const { requestEnvelope, responseBuilder, attributesManager } = handlerInput;
        const { intent } = requestEnvelope.request;
        const sessionAttributes = attributesManager.getSessionAttributes(); //carregando os atributos de sessão
        var cadastrado;
        let speechText = "";
        var arrayRegistro = sessionAttributes['registro']; //carregando o array com todos os remedios cadastrados

        var contTratamento = 0;

        for (var j = 0; j < arrayRegistro.length; j++) {

            if (arrayRegistro[j].tratamento === 0) {

                contTratamento = 1;
            }

        }

        if (contTratamento === 0) {
            var speakOutput = "Nenhum tratamento em andamento, tente cadastrar um tratamento."
        }

        //bloco de código que pega os slots monta um objeto e salva em um array, em seguida carrega como um atributo de sessão
        let remedio = Alexa.getSlotValue(requestEnvelope, 'remedio');

        speechText = "teste";

        for (var i = 0; i < arrayRegistro.length; i++) {


            if (arrayRegistro[i].remedio === remedio) {
                arrayRegistro[i].tratamento = 1;

                speechText = "Tratamento excluido."

            }
        }



        return handlerInput.responseBuilder
            .speak(speechText)
            .getResponse();
    }
};

//---------------------------------------------------------------------------------------------------------------------------------------------------------
//apagar farmacia
const ApagarFarmaciaIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'ApagarFarmaciaIntent';
    },
    handle(handlerInput) {

        const { requestEnvelope, responseBuilder, attributesManager } = handlerInput;
        const { intent } = requestEnvelope.request;
        const sessionAttributes = attributesManager.getSessionAttributes(); //carregando os atributos de sessão
        var cadastrado;
        let speechText = "";
        var arrayRegistro = sessionAttributes['registroFarmacia']; //carregando o array com todos os remedios cadastrados

        if (arrayRegistro.length === 0) {
            var speakOutput = "nenhuma farmácia cadastrada."
        }

        //bloco de código que pega os slots monta um objeto e salva em um array, em seguida carrega como um atributo de sessão
        let farmacia = Alexa.getSlotValue(requestEnvelope, 'farmacia');

        for (var i = 0; i < arrayRegistro.length; i++) {

            if (arrayRegistro[i].farmacia === farmacia) {
                arrayRegistro.splice([i], 1);

                speechText = "Farmácia excluida."

            }
        }


        return handlerInput.responseBuilder
            .speak(speechText)
            .getResponse();
    }
};

//---------------------------------------------------------------------------------------------------------------------------------------------------------
//Código da intenção de apagar registros no geral cadastrados
const ApagarIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'ApagarIntent';
    },
    handle(handlerInput) {

        const { requestEnvelope, responseBuilder, attributesManager } = handlerInput;
        const { intent } = requestEnvelope.request;
        const sessionAttributes = attributesManager.getSessionAttributes(); //carregando os atributos de sessão
        let speechText = "";
        var arrayRegistro = sessionAttributes['registro']; //carregando o array com todos os remedios cadastrados
        var arrayRegistroFarmacia = sessionAttributes['registroFarmacia'];

        if (arrayRegistro.length === 0) {
            speechText = 'Não existem tratamentos cadastrados.'
        }

        if (intent.confirmationStatus === 'CONFIRMED') {

            //bloco de código que pega os slots monta um objeto e salva em um array, em seguida carrega como um atributo de sessão

            let quantidade = Alexa.getSlotValue(requestEnvelope, 'quantidade');

            if (quantidade === 'todos') {

                for (var i = 0; i < arrayRegistro.length; i++) {

                    arrayRegistro[i].tratamento = 1;

                }

                arrayRegistroFarmacia = []
                sessionAttributes['registroFarmacia'] = arrayRegistroFarmacia;
                sessionAttributes['registro'] = arrayRegistro;
                speechText = 'Todos os registros apagados.'

            } else if (quantidade === 'remedios' || quantidade === 'tratamentos') {

                for (var j = 0; j < arrayRegistro.length; j++) {

                    arrayRegistro[j].tratamento = 1;

                }

                sessionAttributes['registro'] = arrayRegistro;
                speechText = 'Todos os registros apagados.'

            } else {

                arrayRegistro = []
                sessionAttributes['registroFarmacia'] = arrayRegistro;
                speechText = 'Todos os registros apagados.'

            }

        } else {
            const repromptText = handlerInput.t('HELP_MSG');
            responseBuilder.reprompt(repromptText);
        }

        return handlerInput.responseBuilder
            .speak(speechText)
            .getResponse();
    }
};


//---------------------------------------------------------------------------------------------------------------------------------------------------------
//lista de remédios do dia.
const RemedioshojeIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'RemedioshojeIntent';
    },
    handle(handlerInput) {

        const { requestEnvelope, responseBuilder, attributesManager } = handlerInput;
        const { intent } = requestEnvelope.request;
        const sessionAttributes = attributesManager.getSessionAttributes(); //carregando os atributos de sessão
        const horasAtual = Date.now();

        let speechText = "";

        var arrayRegistro = sessionAttributes['registro']; //carregando o array com todos os remedios cadastrados
        var arrayRemediosDia = [];
        var contTratamento = 0;

        for (var i = 0; i < arrayRegistro.length; i++) {

            if (arrayRegistro[i].tratamento === 0) {

                contTratamento = 1;
            }

        }

        if (contTratamento === 0) {

            speechText = 'Você não possui tratamentos cadastrados.'

        } else {

            speechText = 'Para hoje você deve tomar os seguintes remédios: '

            for (var j = 0; j < arrayRegistro.length; j++) {

                var remedio = arrayRegistro[i].remedio;
                var hora = arrayRegistro[i].hora;
                var periodo = arrayRegistro[i].periodo;
                var horaInicio = arrayRegistro[i].horas;
                
                if (arrayRegistro[j].tratamento === 0){
                    
                speechText = speechText + remedio + ' de ' + hora + ' em ' + hora + ' horas'
                
                }


            }
        }

        return handlerInput.responseBuilder
            .speak(speechText)
            .getResponse();
    }
};


//---------------------------------------------------------------------------------------------------------------------------------------------------------
//listar remédios cadastrados
const RemediosDoDiaIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'RemediosDoDiaIntent';
    },
    handle(handlerInput) {

        //bloco de código que carrega o array percorre ele e concatena em uma string
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        var arrayRegistro = sessionAttributes['registro'];
        var contTratamento = 0;
        let speechText = "";
        
        
        
        for (var j = 0; j < arrayRegistro.length; j++) {

            if (arrayRegistro[j].tratamento === 0) {

                contTratamento = 1;
            }

        }
        

        if (contTratamento === 0) {
            
            speechText = "Nenhum tratamento em andamento, tente iniciar um tratamento.";

        } else {

            speechText = 'Você iniciou os seguintes tratamentos:'

            for (var i = 0; i < arrayRegistro.length; i++) {

                var remedio = arrayRegistro[i].remedio;
                var hora = arrayRegistro[i].hora;
                var periodo = parseInt(arrayRegistro[i].periodo);
                var dataLimite = new Date(arrayRegistro[i].horas);
                var dia = dataLimite.getDate();
                dia = dia + periodo;
                dataLimite.setDate(dia);
                var mes = dataLimite.getMonth();
                if (arrayRegistro[i].tratamento === 0){
                speechText = speechText + ' Remédio ' + remedio + ' de ' + hora + ' em ' + hora + ' horas , durante ' + periodo + ' Dias'
                }

                if (arrayRegistro.length === i) {

                    speechText = speechText + '.'

                } else {

                    speechText = speechText + '.'

                }
            }
            

        }
        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(handlerInput.t('Pode repetir?'))
            .getResponse();
    }
};


//---------------------------------------------------------------------------------------------------------------------------------------------------------
//listar farmacias cadastradas
const FarmaciaCadastradaIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'FarmaciaCadastradaIntent';
    },
    handle(handlerInput) {

        //bloco de código que carrega o array percorre ele e concatena em uma string
        let speechText = 'Você cadastrou as farmácias '
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        var arrayRegistro = sessionAttributes['registroFarmacia'];

        if (arrayRegistro.length === 0) {

            speechText = 'Você não possui farmácias cadastradas'

        } else {

            for (var i = 0; i < arrayRegistro.length; i++) {

                var farmacia = arrayRegistro[i].farmacia;
                var horaInicial = arrayRegistro[i].horaInicial;
                var horaFinal = arrayRegistro[i].horaFinal;
                var endereco = arrayRegistro[i].endereco;
                speechText = speechText + ' ' + farmacia + ', que abre as ' + horaInicial + ' e fecha as ' + horaFinal + ' , fica localizado na cidade ' + endereco + ''

                if (arrayRegistro.length === i) {

                    speechText = speechText + '.'

                } else {

                    speechText = speechText + '.'

                }
            }
        }
        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(handlerInput.t('Pode repetir?'))
            .getResponse();
    }
};


//---------------------------------------------------------------------------------------------------------------------------------------------------------
//ligar para a emergência
const LigarEmergenciaIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'LigarEmergenciaIntent';
    },
    handle(handlerInput) {
        //bloco de código que carrega o array percorre ele e concatena em uma string
        let speechText = 'Ligando para emergência '
        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(handlerInput.t('Pode repetir?'))
            .getResponse();
    }
};

//---------------------------------------------------------------------------------------------------------------------------------------------------------
//intenção de registro de farmácias
const RegistrarFarmaciaIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'RegistrarFarmaciaIntent';
    },
    handle(handlerInput) {

        const { requestEnvelope, responseBuilder, attributesManager } = handlerInput;
        const { intent } = requestEnvelope.request;
        const sessionAttributes = attributesManager.getSessionAttributes();
        var arrayRegistroFarmacia = sessionAttributes['registroFarmacia'];
        var cadastrado;

        if (arrayRegistroFarmacia.length < 0) {
            arrayRegistroFarmacia = [];
        }

        let speechText = "";

        if (intent.confirmationStatus === 'CONFIRMED') {

            let farmacia = Alexa.getSlotValue(requestEnvelope, 'farmacia');
            let horaInicial = Alexa.getSlotValue(requestEnvelope, 'horaInicial');
            let horaFinal = Alexa.getSlotValue(requestEnvelope, 'horaFinal');
            let endereco = Alexa.getSlotValue(requestEnvelope, 'endereco');

            for (var i = 0; i < arrayRegistroFarmacia.length; i++) {

                if (farmacia === arrayRegistroFarmacia[i].farmacia) {

                    cadastrado = true;

                }
            }

            if (cadastrado) {

                speechText = ('Esta farmácia já foi cadastrado'); // we'll save these values in the next module

            } else {

                var registroFarmacia = new Object();

                registroFarmacia.farmacia = farmacia;
                registroFarmacia.horaInicial = horaInicial;
                registroFarmacia.horaFinal = horaFinal;
                registroFarmacia.endereco = endereco;
                arrayRegistroFarmacia.push(registroFarmacia);
                sessionAttributes['registroFarmacia'] = arrayRegistroFarmacia;
                speechText = ('Cadastrado com sucesso, farmacia ' + farmacia + ' cadastrada.');

            }

        } else {
            const repromptText = handlerInput.t('Pode repetir?');
            responseBuilder.reprompt(repromptText);
        }

        return handlerInput.responseBuilder
            .speak(speechText)
            .getResponse();
    }
};


const HelpHandler = {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest'
            && request.intent.name === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
        return handlerInput.responseBuilder
            .speak(requestAttributes.t('HELP_MESSAGE'))
            .reprompt(requestAttributes.t('HELP_REPROMPT'))
            .getResponse();
    },
};

const FallbackHandler = {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest'
            && request.intent.name === 'AMAZON.FallbackIntent';
    },
    handle(handlerInput) {
        const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
        return handlerInput.responseBuilder
            .speak(requestAttributes.t('FALLBACK_MESSAGE'))
            .reprompt(requestAttributes.t('FALLBACK_REPROMPT'))
            .getResponse();
    },
};

const ExitHandler = {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest'
            && (request.intent.name === 'AMAZON.CancelIntent'
                || request.intent.name === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
        return handlerInput.responseBuilder
            .speak(requestAttributes.t('STOP_MESSAGE'))
            .getResponse();
    },
};

const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        console.log(`Session ended with reason: ${handlerInput.requestEnvelope.request.reason}`);
        return handlerInput.responseBuilder.getResponse();
    },
};

const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        console.log(`Error handled: ${error.message}`);
        console.log(`Error stack: ${error.stack}`);
        const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
        return handlerInput.responseBuilder
            .speak(requestAttributes.t('ERROR_MESSAGE'))
            .reprompt(requestAttributes.t('ERROR_MESSAGE'))
            .getResponse();
    },
};

const LocalizationInterceptor = {
    process(handlerInput) {
        // Gets the locale from the request and initializes i18next.
        const localizationClient = i18n.init({
            lng: handlerInput.requestEnvelope.request.locale,
            resources: languageStrings,
            returnObjects: true
        });
        // Creates a localize function to support arguments.
        localizationClient.localize = function localize() {
            // gets arguments through and passes them to
            // i18next using sprintf to replace string placeholders
            // with arguments.
            const args = arguments;
            const value = i18n.t(...args);
            // If an array is used then a random value is selected
            if (Array.isArray(value)) {
                return value[Math.floor(Math.random() * value.length)];
            }
            return value;
        };
        // this gets the request attributes and save the localize function inside
        // it to be used in a handler by calling requestAttributes.t(STRING_ID, [args...])
        const attributes = handlerInput.attributesManager.getRequestAttributes();
        attributes.t = function translate(...args) {
            return localizationClient.localize(...args);
        }
    }
};// This request interceptor will log all incoming requests to this lambda
const LoggingRequestInterceptor = {
    process(handlerInput) {
        console.log(`Incoming request: ${JSON.stringify(handlerInput.requestEnvelope)}`);
    }
};

// This response interceptor will log all outgoing responses of this lambda
const LoggingResponseInterceptor = {
    process(handlerInput, response) {
        console.log(`Outgoing response: ${JSON.stringify(response)}`);
    }
};

// This request interceptor will bind a translation function 't' to the handlerInput
const LocalisationRequestInterceptor = {
    process(handlerInput) {
        i18n.init({
            lng: Alexa.getLocale(handlerInput.requestEnvelope),
            resources: languageStrings
        }).then((t) => {
            handlerInput.t = (...args) => t(...args);
        });
    }
};

/* *
 * Below we use async and await ( more info: javascript.info/async-await )
 * It's a way to wrap promises and waait for the result of an external async operation
 * Like getting and saving the persistent attributes
 * */
const LoadAttributesRequestInterceptor = {
    async process(handlerInput) {
        const { attributesManager, requestEnvelope } = handlerInput;
        if (Alexa.isNewSession(requestEnvelope)) { //is this a new session? this check is not enough if using auto-delegate (more on next module)
            const persistentAttributes = await attributesManager.getPersistentAttributes() || {};
            console.log('Loading from persistent storage: ' + JSON.stringify(persistentAttributes));
            //copy persistent attribute to session attributes
            attributesManager.setSessionAttributes(persistentAttributes); // ALL persistent attributtes are now session attributes
        }
    }
};

// If you disable the skill and reenable it the userId might change and you loose the persistent attributes saved below as userId is the primary key
const SaveAttributesResponseInterceptor = {
    async process(handlerInput, response) {
        if (!response) return; // avoid intercepting calls that have no outgoing response due to errors
        const { attributesManager, requestEnvelope } = handlerInput;
        const sessionAttributes = attributesManager.getSessionAttributes();
        const shouldEndSession = (typeof response.shouldEndSession === "undefined" ? true : response.shouldEndSession); //is this a session end?
        if (shouldEndSession || Alexa.getRequestType(requestEnvelope) === 'SessionEndedRequest') { // skill was stopped or timed out
            // we increment a persistent session counter here
            sessionAttributes['sessionCounter'] = sessionAttributes['sessionCounter'] ? sessionAttributes['sessionCounter'] + 1 : 1;
            // we make ALL session attributes persistent
            console.log('Saving to persistent storage:' + JSON.stringify(sessionAttributes));
            attributesManager.setPersistentAttributes(sessionAttributes);
            await attributesManager.savePersistentAttributes();
        }
    }
};

const skillBuilder = Alexa.SkillBuilders.custom();

exports.handler = skillBuilder
    .addRequestHandlers(
        LaunchRequestHandler,
        RegistrarRemediosIntentHandler,
        RegistrarFarmaciaIntentHandler,
        ApagarFarmaciaIntentHandler,
        FarmaciaCadastradaIntentHandler,
        LigarEmergenciaIntentHandler,
        RemediosDoDiaIntentHandler,
        FarmaciaCadastradaIntentHandler,
        ApagarIntentHandler,
        ApagarTratamentoIntentHandler,
        HelpHandler,
        RemedioshojeIntentHandler,
        ExitHandler,
        FallbackHandler,
        SessionEndedRequestHandler,
    ).addRequestInterceptors(
        LocalisationRequestInterceptor,
        LoggingRequestInterceptor,
        LoadAttributesRequestInterceptor)
    .addResponseInterceptors(
        LoggingResponseInterceptor,
        SaveAttributesResponseInterceptor)
    .addRequestInterceptors(LocalizationInterceptor)
    .addErrorHandlers(ErrorHandler)
    .withPersistenceAdapter(persistenceAdapter)
    .withCustomUserAgent('sample/basic-fact/v2')



    .lambda();
