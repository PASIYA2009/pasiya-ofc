/* Tiny ZIP maker/reader for PASIYA AI projects (no libraries) */
(function (root) {
  "use strict";
  var T = null;
  function crc32(u8) {
    if (!T) { T = new Uint32Array(256); for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; T[n] = c >>> 0; } }
    var crc = 0xffffffff;
    for (var i = 0; i < u8.length; i++) crc = T[(crc ^ u8[i]) & 255] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
  }
  var enc = new TextEncoder(), dec = new TextDecoder("utf-8");

  /* files: [{path, content: string | Uint8Array}] -> Blob (stored, no compression) */
  function create(files) {
    var d = new Date(), time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1),
      date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    var parts = [], central = [], offset = 0, count = 0;
    files.forEach(function (f) {
      var name = enc.encode(f.path.replace(/^\/+/, "")), data = typeof f.content === "string" ? enc.encode(f.content) : f.content, crc = crc32(data);
      var h = new Uint8Array(30 + name.length), v = new DataView(h.buffer);
      v.setUint32(0, 0x04034b50, true); v.setUint16(4, 20, true); v.setUint16(6, 0x0800, true); v.setUint16(8, 0, true);
      v.setUint16(10, time, true); v.setUint16(12, date, true); v.setUint32(14, crc, true); v.setUint32(18, data.length, true);
      v.setUint32(22, data.length, true); v.setUint16(26, name.length, true); v.setUint16(28, 0, true); h.set(name, 30);
      var c = new Uint8Array(46 + name.length), w = new DataView(c.buffer);
      w.setUint32(0, 0x02014b50, true); w.setUint16(4, 20, true); w.setUint16(6, 20, true); w.setUint16(8, 0x0800, true); w.setUint16(10, 0, true);
      w.setUint16(12, time, true); w.setUint16(14, date, true); w.setUint32(16, crc, true); w.setUint32(20, data.length, true);
      w.setUint32(24, data.length, true); w.setUint16(28, name.length, true); w.setUint32(42, offset, true); c.set(name, 46);
      parts.push(h, data); central.push(c); offset += h.length + data.length; count++;
    });
    var cdSize = central.reduce(function (a, c) { return a + c.length; }, 0), e = new Uint8Array(22), ev = new DataView(e.buffer);
    ev.setUint32(0, 0x06054b50, true); ev.setUint16(8, count, true); ev.setUint16(10, count, true); ev.setUint32(12, cdSize, true); ev.setUint32(16, offset, true);
    return new Blob(parts.concat(central, [e]), { type: "application/zip" });
  }

  function inflate(u8) {
    return new Response(new Blob([u8]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).arrayBuffer().then(function (b) { return new Uint8Array(b); });
  }

  /* Blob|ArrayBuffer -> Promise<[{path, bytes}]> */
  function read(input) {
    var p = input.arrayBuffer ? input.arrayBuffer() : Promise.resolve(input);
    return p.then(function (buf) {
      var u8 = new Uint8Array(buf), v = new DataView(buf), eocd = -1;
      for (var i = u8.length - 22; i >= Math.max(0, u8.length - 65557); i--) if (v.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
      if (eocd < 0) throw new Error("This is not a valid ZIP file.");
      var n = v.getUint16(eocd + 10, true), p0 = v.getUint32(eocd + 16, true), jobs = [];
      for (var k = 0; k < n; k++) {
        if (v.getUint32(p0, true) !== 0x02014b50) break;
        var method = v.getUint16(p0 + 10, true), csize = v.getUint32(p0 + 20, true), nl = v.getUint16(p0 + 28, true), el = v.getUint16(p0 + 30, true),
          cl = v.getUint16(p0 + 32, true), lo = v.getUint32(p0 + 42, true), name = dec.decode(u8.subarray(p0 + 46, p0 + 46 + nl));
        p0 += 46 + nl + el + cl;
        if (/\/$/.test(name)) continue;
        var ln = v.getUint16(lo + 26, true), le = v.getUint16(lo + 28, true), start = lo + 30 + ln + le, raw = u8.subarray(start, start + csize);
        jobs.push({ name: name, method: method, raw: raw });
      }
      return Promise.all(jobs.map(function (j) {
        if (j.method === 0) return { path: j.name, bytes: j.raw };
        if (j.method === 8) return inflate(j.raw).then(function (b) { return { path: j.name, bytes: b }; });
        return null;
      })).then(function (r) { return r.filter(Boolean); });
    });
  }

  root.PZip = { create: create, read: read, decode: function (u8) { return dec.decode(u8); } };
})(typeof window !== "undefined" ? window : globalThis);
