const bs58 = require('bs58');

// Inspired by https://stackoverflow.com/questions/56073688/base58-javascript-implementation
// & https://gist.github.com/diafygi/90a3e80ca1c2793220e5/
// & https://stackoverflow.com/questions/40031688/javascript-arraybuffer-to-hex
function getBytes32FromIpfsHash(ipfsCidString) {
    const MAP = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
    const b58String_to_b10Array = function(S,A){var d=[],b=[],i,j,c,n;for(i in S){j=0,c=A.indexOf(S[i]);if(c<0)return undefined;c||b.length^i?i:b.push(0);while(j in d||c){n=d[j];n=n?n*58+c:c;c=n>>8;d[j]=n%256;j++}}while(j--)b.push(d[j]);return new Uint8Array(b)};
    const b10Array = b58String_to_b10Array(ipfsCidString, MAP);
    const b16 = buf2hex(b10Array.slice(2).buffer);
    return `0x${b16}`;
}

function buf2hex(buffer) {
    return [...new Uint8Array(buffer)]
        .map(x => x.toString(16).padStart(2, '0'))
        .join('');
}

module.exports = {

    // Return bytes32 hex string from base58 encoded ipfs hash,
    // stripping leading 2 bytes from 34 byte IPFS hash
    // Assume IPFS defaults: function:0x12=sha2, size:0x20=256 bits
    // E.g. "QmNSUYVKDSvPUnRLKmuxk9diJ6yS96r1TrAXzjTiBcCLAL" -->
    // "0x017dfd85d4f6cb4dcd715a88101f7b1f06cd1e009b2327a0809d01eb9c91f231"

    getBytes32FromIpfsHash,

    // Return base58 encoded ipfs hash from bytes32 hex string,
    // E.g. "0x017dfd85d4f6cb4dcd715a88101f7b1f06cd1e009b2327a0809d01eb9c91f231"
    // --> "QmNSUYVKDSvPUnRLKmuxk9diJ6yS96r1TrAXzjTiBcCLAL"

    getIpfsHashFromBytes32: (bytes32Hex) => {
        // Add our default ipfs values for first 2 bytes:
        // function:0x12=sha2, size:0x20=256 bits
        // and cut off leading "0x"
        const hashHex = "1220" + bytes32Hex.slice(2);
        const hashBytes = Buffer.from(hashHex, 'hex');
        const hashStr = bs58.encode(hashBytes);
        return hashStr;
    }

};