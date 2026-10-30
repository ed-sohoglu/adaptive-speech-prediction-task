function [mix,speech,ns,mag,lpc_val] = es_addNoiseToSpeech(speech,SNR,fs,params)

% Add spectrally matched noise to speech signal according to specified SNR
% speech = audio waveform of speech
% SNR = Signal-To-Noise-Ratio (dB)
% params.method = 'FFT' or 'LPC'
% params.mag = (optional) for FFT method, predefined/estimated spectrum magnitudes (for creating noise)
% params.lpc_val = (optional) for LPC method, structure containing predefined/estimated LPC coefficients (for creating noise)
% params.lpc_version = (optional) for LPC method, 'male' or 'female' optimised LPC coefficients (for creating noise). Defaults to 'male'
% Ed Sohoglu 2021

% NB- ASSUMES MONO!!!!

try; method = params.method; catch; method = 'LPC'; end
try; mag = params.mag; catch; mag = []; end
try; lpc_val = params.lpc_val; catch; lpc_val = []; end
try; lpc_version = params.lpc_version; catch; lpc_version = 'male'; end

% work out length of speech signal
nSamples = size(speech,1);

% zero pad speech if number of samples fewer than spectrum
if strcmp(method,'FFT') && ~isempty(mag)
    nSamples_spec = size(mag,1);  
    diffLength = nSamples_spec-nSamples;
    speech = [speech; zeros(diffLength,1)];
    nSamples = size(speech,1);
end

if strcmp(method,'FFT') % make noise (spectrally matched to speech)
    if isempty(mag)
        mag = abs(fft(speech));
    end
    ph = rand(nSamples,1)*2*pi-pi;
    ns = real(ifft(mag.*exp(1i*ph)));   
elseif strcmp(method,'LPC') % make noise (spectrally matched to speech)- LPC method
    if isempty(lpc_val)
        nlpc = 1024; % number of points to evaluate frequency response; ~20 ms (if set to 1024 for 48K sampling rate)
        if strcmp(lpc_version,'male')
            n = (fs/1e3) + 4; % Markel & Gray (1976) recommendation for nth order of linear predictive coding (LPC).
        elseif strcmp(lpc_version,'female')
            n = ((fs/1e3)/1.2) + 2; % nth-order recommendation for female adult speech
        end
        [a1,g1] = lpc(speech,n); % get estimated LPC coefficients of long term average speech spectrum
    else
        a1 = lpc_val.a1;
        g1 = lpc_val.g1;
        nlpc = lpc_val.nlpc;
    end
    [H1,F1] = freqz(g1,a1,nlpc,fs); % frequency response of digital filter (if plotting)
    ns = randn(nSamples,1);
    ns = filter(g1,a1,ns); % filter white noise with LPC coefficients to create SSN
    lpc_val.a1 = a1;
    lpc_val.g1 = g1;
    lpc_val.nlpc = nlpc;
end

ns = ns*(rms(speech)/rms(ns)); % match rms of noise to rms of speech
ns = ns/db2mag(SNR); % apply SNR weighting

mix = speech+ns; % mix speech and noise
mix = mix(1:nSamples);

% snr(speech,ns) % check SNR

%% Plot frequency response of noise (generated using lpc method)

% if strcmp(method,'LPC')   
%     [a2,g2] = lpc(ns,n);
%     [H2,F2] = freqz(g2,a2,nlpc,fs); % frequency response of digital filter
%     
%     % PLOT LTASS VERSUS LTAS OF SSN and SMN
%     p1 = plot(F1/1e3,mag2db(abs([H1,H2])),'linewidth',3);
%     
%     p1(1).Color = 'k';
%     p1(2).Color = 'r';
%     
%     ax = gca;
%     ax.XLim = ([0.001 16]); % define x-axis limits from 20 Hz to 20 kHz
%     grid on;
%     grid minor;
%     xlabel('Frequency (kHz)');
%     ylabel('Magnitude (dB)');
%     title('Long term average spectra');
%     ax.FontSize = 14;
%     ax.FontWeight = 'bold';
%     legend({'LTASS','LTAS SSN'});   
% end