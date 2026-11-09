import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.interactive.form.*;
import java.io.File; import java.nio.file.*; import java.util.*;
/** Mirrors packs PdfUtils.fill (setNeedAppearances, text setValue or null, buttons Off, push buttons/signatures untouched). args: template out key=value... */
public class MosoFill { public static void main(String[] a) throws Exception {
  Map<String,String> data = new HashMap<>();
  for (int i = 2; i < a.length; i++) { int e = a[i].indexOf('='); data.put(a[i].substring(0, e), a[i].substring(e + 1)); }
  try (PDDocument d = PDDocument.load(new File(a[0]))) {
    PDAcroForm af = d.getDocumentCatalog().getAcroForm();
    af.setNeedAppearances(true);
    for (PDField f : af.getFields()) {
      String v = data.get(f.getPartialName());
      if (f instanceof PDSignatureField || f instanceof PDPushButton) continue;
      if (v == null || v.isEmpty()) { if (f instanceof PDButton) f.setValue("Off"); else f.setValue(null); }
      else f.setValue(v);
    }
    d.save(new File(a[1]));
  } } }
